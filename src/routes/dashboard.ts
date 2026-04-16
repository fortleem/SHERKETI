import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken } from '../utils/auth'

export const dashboardRoutes = new Hono<AppType>()

// Investor Dashboard
dashboardRoutes.get('/investor', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const portfolio = await c.env.DB.prepare(`
    SELECT s.*, p.title, p.title_ar, p.status as project_status, p.health_score, p.tier,
           p.pre_money_valuation, p.sector, p.funding_raised, p.funding_goal,
           p.jozour_equity_percent, p.jozour_commission_percent
    FROM shareholdings s LEFT JOIN projects p ON s.project_id = p.id
    WHERE s.user_id = ? AND s.status IN ('active','reserved','vesting')
    ORDER BY s.investment_amount DESC
  `).bind(payload.uid).all()

  let totalInvested = 0, totalCurrentValue = 0
  for (const s of portfolio.results as any[]) {
    totalInvested += s.investment_amount || 0
    totalCurrentValue += (s.equity_percentage / 100) * (s.pre_money_valuation || 0)
  }

  const pendingVotes = await c.env.DB.prepare(`
    SELECT v.*, p.title as project_title FROM votes v
    INNER JOIN shareholdings s ON v.project_id = s.project_id
    LEFT JOIN projects p ON v.project_id = p.id
    WHERE s.user_id = ? AND s.status = 'active' AND v.status = 'open'
    AND v.id NOT IN (SELECT vote_id FROM vote_records WHERE user_id = ?)
  `).bind(payload.uid, payload.uid).all()

  const dividends = await c.env.DB.prepare(`
    SELECT et.*, p.title FROM escrow_transactions et
    LEFT JOIN projects p ON et.project_id = p.id
    WHERE et.transaction_type = 'dividend' AND et.status = 'completed'
    AND et.project_id IN (SELECT project_id FROM shareholdings WHERE user_id = ?)
    ORDER BY et.created_at DESC LIMIT 10
  `).bind(payload.uid).all()

  const notifications = await c.env.DB.prepare(`
    SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND read_status = 0
  `).bind(payload.uid).first<{unread: number}>()

  const marketOpportunities = await c.env.DB.prepare(`
    SELECT mo.*, p.title FROM market_orders mo
    LEFT JOIN projects p ON mo.project_id = p.id
    WHERE mo.status IN ('listed','priority_window') AND mo.seller_id != ?
    ORDER BY mo.created_at DESC LIMIT 5
  `).bind(payload.uid).all()

  const recentActivity = await c.env.DB.prepare(`
    SELECT n.*, p.title as project_title FROM notifications n
    LEFT JOIN projects p ON n.project_id = p.id
    WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 10
  `).bind(payload.uid).all()

  return c.json({
    portfolio: portfolio.results,
    summary: {
      total_invested: totalInvested,
      current_value: totalCurrentValue,
      roi: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested * 100).toFixed(2) + '%' : '0%',
      projects_count: portfolio.results.length
    },
    pending_votes: pendingVotes.results,
    recent_dividends: dividends.results,
    unread_notifications: notifications?.unread || 0,
    market_opportunities: marketOpportunities.results,
    recent_activity: recentActivity.results
  })
})

// Founder Dashboard
dashboardRoutes.get('/founder', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const projects = await c.env.DB.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM shareholdings WHERE project_id = p.id AND status = 'active') as investor_count,
      (SELECT COUNT(*) FROM votes WHERE project_id = p.id AND status = 'open') as open_votes,
      (SELECT COUNT(*) FROM risk_alerts WHERE project_id = p.id AND status = 'active') as active_alerts,
      (SELECT COUNT(*) FROM disputes WHERE project_id = p.id AND status NOT IN ('resolved','dismissed')) as active_disputes
    FROM projects p WHERE p.founder_id = ? ORDER BY p.created_at DESC
  `).bind(payload.uid).all()

  const milestones = await c.env.DB.prepare(`
    SELECT m.*, p.title as project_title FROM milestones m
    LEFT JOIN projects p ON m.project_id = p.id
    WHERE p.founder_id = ? ORDER BY m.order_index ASC
  `).bind(payload.uid).all()

  const salary = await c.env.DB.prepare(`
    SELECT * FROM salary_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 6
  `).bind(payload.uid).all()

  const escrow = await c.env.DB.prepare(`
    SELECT p.id, p.title, p.tier, p.jozour_commission_percent, p.jozour_equity_percent,
      COALESCE((SELECT SUM(amount) FROM escrow_transactions WHERE project_id = p.id AND transaction_type = 'deposit' AND status = 'completed'), 0) as total_deposits,
      COALESCE((SELECT SUM(amount) FROM escrow_transactions WHERE project_id = p.id AND transaction_type = 'release' AND status = 'completed'), 0) as total_released,
      COALESCE((SELECT SUM(amount) FROM escrow_transactions WHERE project_id = p.id AND transaction_type = 'commission' AND status = 'completed'), 0) as jozour_commission_paid
    FROM projects p WHERE p.founder_id = ?
  `).bind(payload.uid).all()

  const pendingVotes = await c.env.DB.prepare(`
    SELECT v.*, p.title as project_title FROM votes v
    LEFT JOIN projects p ON v.project_id = p.id
    WHERE v.status = 'open' AND p.founder_id = ?
    ORDER BY v.created_at DESC
  `).bind(payload.uid).all()

  const board = await c.env.DB.prepare(`
    SELECT b.*, u.full_name, p.title as project_title FROM board_members b
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN projects p ON b.project_id = p.id
    WHERE p.founder_id = ? AND b.status IN ('active', 'pending_renewal_vote')
    ORDER BY b.project_id, b.role
  `).bind(payload.uid).all()

  return c.json({
    projects: projects.results,
    milestones: milestones.results,
    salary_records: salary.results,
    escrow_overview: escrow.results,
    pending_votes: pendingVotes.results,
    board_members: board.results
  })
})

// Manager Dashboard
dashboardRoutes.get('/manager', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const managedProjects = await c.env.DB.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM shareholdings WHERE project_id = p.id AND status = 'active') as investor_count,
      (SELECT COUNT(*) FROM risk_alerts WHERE project_id = p.id AND status = 'active') as active_alerts
    FROM projects p
    INNER JOIN board_members b ON p.id = b.project_id
    WHERE b.user_id = ? AND b.role = 'manager' AND b.status = 'active'
  `).bind(payload.uid).all()

  const pendingTransactions = await c.env.DB.prepare(`
    SELECT et.*, p.title FROM escrow_transactions et
    LEFT JOIN projects p ON et.project_id = p.id
    WHERE et.status = 'pending' AND et.project_id IN (
      SELECT project_id FROM board_members WHERE user_id = ? AND status = 'active'
    )
  `).bind(payload.uid).all()

  const salaryRecords = await c.env.DB.prepare(`
    SELECT sr.*, u.full_name, p.title as project_title FROM salary_records sr
    LEFT JOIN users u ON sr.user_id = u.id
    LEFT JOIN projects p ON sr.project_id = p.id
    WHERE sr.project_id IN (SELECT project_id FROM board_members WHERE user_id = ? AND role = 'manager' AND status = 'active')
    ORDER BY sr.created_at DESC LIMIT 20
  `).bind(payload.uid).all()

  return c.json({
    managed_projects: managedProjects.results,
    pending_transactions: pendingTransactions.results,
    salary_records: salaryRecords.results
  })
})

// Law Firm Portal
dashboardRoutes.get('/law-firm', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const assignedProjects = await c.env.DB.prepare(`
    SELECT p.*, u.full_name as founder_name, 
      (SELECT SUM(amount) FROM escrow_transactions WHERE project_id = p.id AND status = 'completed') as total_escrow_volume
    FROM projects p
    LEFT JOIN users u ON p.founder_id = u.id
    WHERE p.law_firm_id = ?
  `).bind(payload.uid).all()

  const pendingEscrow = await c.env.DB.prepare(`
    SELECT et.*, p.title FROM escrow_transactions et
    LEFT JOIN projects p ON et.project_id = p.id
    WHERE et.status IN ('pending','completed') AND p.law_firm_id = ?
    ORDER BY et.created_at DESC LIMIT 30
  `).bind(payload.uid).all()

  const pendingNotarizations = await c.env.DB.prepare(`
    SELECT v.*, p.title FROM votes v
    LEFT JOIN projects p ON v.project_id = p.id
    WHERE v.status = 'passed' AND v.result_notarized = 0 AND p.law_firm_id = ?
  `).bind(payload.uid).all()

  const disputes = await c.env.DB.prepare(`
    SELECT d.*, p.title as project_title, u.full_name as filed_by_name FROM disputes d
    LEFT JOIN projects p ON d.project_id = p.id
    LEFT JOIN users u ON d.filed_by = u.id
    WHERE d.status = 'law_firm_arbitration' AND p.law_firm_id = ?
  `).bind(payload.uid).all()

  return c.json({
    assigned_projects: assignedProjects.results,
    escrow_transactions: pendingEscrow.results,
    pending_notarizations: pendingNotarizations.results,
    pending_disputes: disputes.results
  })
})

// Regulator Shadow Mode (FRA Read-Only)
dashboardRoutes.get('/regulator', async (c) => {
  const projectStats = await c.env.DB.prepare(`
    SELECT tier, status, COUNT(*) as count, SUM(funding_goal) as total_goal, SUM(funding_raised) as total_raised,
           AVG(ai_feasibility_score) as avg_ai_score, AVG(health_score) as avg_health
    FROM projects GROUP BY tier, status
  `).all()

  const escrowBalance = await c.env.DB.prepare(`
    SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
    FROM escrow_transactions WHERE status = 'completed' GROUP BY transaction_type
  `).all()

  const governanceStats = await c.env.DB.prepare(`
    SELECT event_type, COUNT(*) as count FROM governance_events GROUP BY event_type
  `).all()

  const marketVolume = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count, SUM(shares_count * ask_price) as volume
    FROM market_orders GROUP BY status
  `).all()

  const riskSummary = await c.env.DB.prepare(`
    SELECT alert_level, risk_category, COUNT(*) as count
    FROM risk_alerts WHERE status = 'active' GROUP BY alert_level, risk_category
  `).all()

  const jozourStats = await c.env.DB.prepare(`
    SELECT tier, COUNT(*) as projects, 
           SUM(jozour_commission_percent * funding_raised / 100) as total_commission,
           SUM(jozour_equity_percent) as total_equity_pct,
           SUM(CASE WHEN jozour_veto_active = 1 THEN 1 ELSE 0 END) as active_vetos
    FROM projects WHERE status NOT IN ('draft', 'rejected')
    GROUP BY tier
  `).all()

  const disputeStats = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count FROM disputes GROUP BY status
  `).all()

  return c.json({
    project_statistics: projectStats.results,
    escrow_balance: escrowBalance.results,
    governance_events: governanceStats.results,
    secondary_market: marketVolume.results,
    active_risks: riskSummary.results,
    jozour_overview: jozourStats.results,
    dispute_summary: disputeStats.results,
    disclaimer: 'FRA Shadow Mode: Aggregated data only. No personally identifiable information exposed.'
  })
})

// Accountant Dashboard
dashboardRoutes.get('/accountant', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  // Get projects where user is independent accountant on the board
  const assignedProjects = await c.env.DB.prepare(`
    SELECT p.*, u.full_name as founder_name,
      (SELECT COUNT(*) FROM shareholdings WHERE project_id = p.id AND status = 'active') as investor_count,
      (SELECT SUM(amount) FROM escrow_transactions WHERE project_id = p.id AND status = 'completed') as total_escrow_volume
    FROM projects p
    INNER JOIN board_members b ON p.id = b.project_id
    LEFT JOIN users u ON p.founder_id = u.id
    WHERE b.user_id = ? AND b.role = 'independent_accountant' AND b.status = 'active'
  `).bind(payload.uid).all()

  // Pending dual-signature transactions (accountant approval needed)
  const pendingDualSig = await c.env.DB.prepare(`
    SELECT et.*, p.title, p.tier FROM escrow_transactions et
    LEFT JOIN projects p ON et.project_id = p.id
    WHERE et.requires_dual_signature = 1 AND et.accountant_approved = 0 AND et.status = 'pending'
    AND et.project_id IN (
      SELECT project_id FROM board_members WHERE user_id = ? AND role = 'independent_accountant' AND status = 'active'
    )
    ORDER BY et.created_at DESC
  `).bind(payload.uid).all()

  // Recent transactions requiring oversight
  const recentTransactions = await c.env.DB.prepare(`
    SELECT et.*, p.title FROM escrow_transactions et
    LEFT JOIN projects p ON et.project_id = p.id
    WHERE et.project_id IN (
      SELECT project_id FROM board_members WHERE user_id = ? AND role = 'independent_accountant' AND status = 'active'
    )
    ORDER BY et.created_at DESC LIMIT 30
  `).bind(payload.uid).all()

  // Salary records pending review
  const salaryRecords = await c.env.DB.prepare(`
    SELECT sr.*, u.full_name, p.title as project_title FROM salary_records sr
    LEFT JOIN users u ON sr.user_id = u.id
    LEFT JOIN projects p ON sr.project_id = p.id
    WHERE sr.project_id IN (
      SELECT project_id FROM board_members WHERE user_id = ? AND role = 'independent_accountant' AND status = 'active'
    )
    ORDER BY sr.created_at DESC LIMIT 20
  `).bind(payload.uid).all()

  // Tax records
  const taxRecords = await c.env.DB.prepare(`
    SELECT tr.*, p.title as project_title FROM tax_records tr
    LEFT JOIN projects p ON tr.project_id = p.id
    WHERE tr.project_id IN (
      SELECT project_id FROM board_members WHERE user_id = ? AND role = 'independent_accountant' AND status = 'active'
    )
    ORDER BY tr.created_at DESC LIMIT 20
  `).bind(payload.uid).all()

  // Financial alerts
  const financialAlerts = await c.env.DB.prepare(`
    SELECT ra.*, p.title FROM risk_alerts ra
    LEFT JOIN projects p ON ra.project_id = p.id
    WHERE ra.risk_category = 'financial' AND ra.status = 'active'
    AND ra.project_id IN (
      SELECT project_id FROM board_members WHERE user_id = ? AND role = 'independent_accountant' AND status = 'active'
    )
  `).bind(payload.uid).all()

  return c.json({
    assigned_projects: assignedProjects.results,
    pending_dual_signature: pendingDualSig.results,
    recent_transactions: recentTransactions.results,
    salary_records: salaryRecords.results,
    tax_records: taxRecords.results,
    financial_alerts: financialAlerts.results,
    transaction_approval_rules: {
      under_1_percent: 'Manager approval only',
      between_1_10_percent: 'Dual signature: Manager + Independent Accountant (YOU)',
      over_10_percent: 'Full Board vote required (48h notice)',
      recurring: 'Pre-approved with monthly caps; overrun requires dual signature',
      emergency: 'Any two board members can approve, ratified by full board within 7 days'
    }
  })
})

// Platform-wide stats (public)
dashboardRoutes.get('/platform-stats', async (c) => {
  const totalProjects = await c.env.DB.prepare('SELECT COUNT(*) as count FROM projects').first<{count:number}>()
  const totalInvestors = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'investor'").first<{count:number}>()
  const totalRaised = await c.env.DB.prepare("SELECT SUM(funding_raised) as total FROM projects WHERE status IN ('funded','active','live_fundraising')").first<{total:number}>()
  const activeProjects = await c.env.DB.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('live_fundraising','active','funded')").first<{count:number}>()
  const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{count:number}>()

  return c.json({
    total_projects: totalProjects?.count || 0,
    total_investors: totalInvestors?.count || 0,
    total_raised: totalRaised?.total || 0,
    active_projects: activeProjects?.count || 0,
    total_users: totalUsers?.count || 0,
    jozour_fee_model: '2.5% commission + 2.5% equity (ALL tiers A/B/C/D)',
    currency: 'EGP'
  })
})
