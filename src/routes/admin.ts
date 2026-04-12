import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const adminRoutes = new Hono<AppType>()

// Admin: Get all users
adminRoutes.get('/users', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit
  const role = c.req.query('role')
  const status = c.req.query('status')

  let query = `SELECT id, email, full_name, full_name_ar, user_type, role, verification_status, reputation_score, region, created_at, last_login FROM users WHERE 1=1`
  const params: any[] = []
  if (role) { query += ' AND role = ?'; params.push(role) }
  if (status) { query += ' AND verification_status = ?'; params.push(status) }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const users = await c.env.DB.prepare(query).bind(...params).all()
  const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{count:number}>()
  return c.json({ users: users.results, total: total?.count || 0, page, limit })
})

// Admin: Approve/Reject KYC
adminRoutes.post('/users/:id/kyc', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const id = parseInt(c.req.param('id'))
  const { action, reason } = await c.req.json() // 'approve' or 'reject'

  if (action === 'approve') {
    await c.env.DB.prepare(`UPDATE users SET verification_status = 'verified', kyc_level = 2, aml_cleared = 1, sanctions_cleared = 1 WHERE id = ?`).bind(id).run()
  } else {
    await c.env.DB.prepare(`UPDATE users SET verification_status = 'rejected', ban_reason = ? WHERE id = ?`).bind(reason || 'KYC rejected', id).run()
  }

  await logAudit(c.env.DB, `kyc_${action}`, 'user', id, payload.uid, JSON.stringify({ action, reason }))
  return c.json({ success: true, message: `User KYC ${action}d` })
})

// Admin: Get all projects
adminRoutes.get('/projects', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const projects = await c.env.DB.prepare(`
    SELECT p.*, u.full_name as founder_name, u.reputation_score as founder_rep,
      (SELECT COUNT(*) FROM shareholdings WHERE project_id = p.id) as investor_count,
      (SELECT COUNT(*) FROM risk_alerts WHERE project_id = p.id AND status = 'active') as active_alerts
    FROM projects p LEFT JOIN users u ON p.founder_id = u.id ORDER BY p.created_at DESC
  `).all()

  return c.json({ projects: projects.results })
})

// Admin: Assign law firm
adminRoutes.post('/projects/:id/assign-lawfirm', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const id = parseInt(c.req.param('id'))
  const { law_firm_id } = await c.req.json()

  await c.env.DB.prepare('UPDATE projects SET law_firm_id = ? WHERE id = ?').bind(law_firm_id, id).run()
  await logAudit(c.env.DB, 'lawfirm_assigned', 'project', id, payload.uid, JSON.stringify({ law_firm_id }))
  return c.json({ success: true })
})

// Admin: Emergency freeze
adminRoutes.post('/projects/:id/freeze', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const id = parseInt(c.req.param('id'))
  const { reason } = await c.req.json()

  await c.env.DB.prepare("UPDATE projects SET status = 'frozen', governance_state = 'frozen' WHERE id = ?").bind(id).run()
  
  // Freeze all pending escrow
  await c.env.DB.prepare("UPDATE escrow_transactions SET status = 'frozen' WHERE project_id = ? AND status = 'pending'").bind(id).run()

  // Create red alert
  await c.env.DB.prepare(`
    INSERT INTO risk_alerts (project_id, alert_level, risk_category, title, description, status)
    VALUES (?, 'red', 'compliance', 'Emergency Freeze', ?, 'active')
  `).bind(id, reason || 'Emergency freeze triggered by platform admin').run()

  // Log governance event
  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'emergency_freeze', ?, 'human-override', ?)
  `).bind(id, payload.uid, JSON.stringify({ reason, timestamp: new Date().toISOString() })).run()

  await logAudit(c.env.DB, 'emergency_freeze', 'project', id, payload.uid, JSON.stringify({ reason }))

  return c.json({ success: true, message: 'Project frozen. All escrow transactions halted. Stakeholders notified.' })
})

// Admin: Audit log
adminRoutes.get('/audit-log', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '100')
  const offset = (page - 1) * limit
  const entity = c.req.query('entity')

  let query = 'SELECT al.*, u.full_name as actor_name FROM audit_log al LEFT JOIN users u ON al.actor_id = u.id WHERE 1=1'
  const params: any[] = []
  if (entity) { query += ' AND al.entity_type = ?'; params.push(entity) }
  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const logs = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ audit_log: logs.results })
})

// Admin: Platform overview
adminRoutes.get('/overview', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const users = await c.env.DB.prepare(`
    SELECT role, verification_status, COUNT(*) as count FROM users GROUP BY role, verification_status
  `).all()

  const projects = await c.env.DB.prepare(`
    SELECT tier, status, COUNT(*) as count, SUM(funding_goal) as total_goal, SUM(funding_raised) as total_raised
    FROM projects GROUP BY tier, status
  `).all()

  const escrow = await c.env.DB.prepare(`
    SELECT transaction_type, status, COUNT(*) as count, SUM(amount) as total
    FROM escrow_transactions GROUP BY transaction_type, status
  `).all()

  const alerts = await c.env.DB.prepare(`
    SELECT alert_level, COUNT(*) as count FROM risk_alerts WHERE status = 'active' GROUP BY alert_level
  `).all()

  return c.json({ users: users.results, projects: projects.results, escrow: escrow.results, active_alerts: alerts.results })
})
