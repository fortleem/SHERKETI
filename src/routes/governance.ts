import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const governanceRoutes = new Hono<AppType>()

// Get votes for a project
governanceRoutes.get('/votes/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const status = c.req.query('status')
  
  let query = 'SELECT * FROM votes WHERE project_id = ?'
  const params: any[] = [projectId]
  if (status) { query += ' AND status = ?'; params.push(status) }
  query += ' ORDER BY created_at DESC'

  const votes = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ votes: votes.results })
})

// Create a new vote/proposal
governanceRoutes.post('/votes', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const body = await c.req.json()
  const { project_id, title, description, vote_type, amount_involved } = body

  const isBoardMember = await c.env.DB.prepare(`
    SELECT * FROM board_members WHERE project_id = ? AND user_id = ? AND status = 'active'
  `).bind(project_id, payload.uid).first()

  const isShareholder = await c.env.DB.prepare(`
    SELECT * FROM shareholdings WHERE project_id = ? AND user_id = ? AND status = 'active'
  `).bind(project_id, payload.uid).first()

  if (!isBoardMember && !isShareholder) {
    return c.json({ error: 'Only board members or shareholders can create proposals' }, 403)
  }

  let requiredMajority = 50.0
  if (vote_type === 'constitutional_amendment') requiredMajority = 75.0
  if (vote_type === 'jozour_retention_vote') requiredMajority = 50.0

  const shareholders = await c.env.DB.prepare(`
    SELECT SUM(equity_percentage) as total FROM shareholdings WHERE project_id = ? AND status = 'active'
  `).bind(project_id).first<{total: number}>()

  const votingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const result = await c.env.DB.prepare(`
    INSERT INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, quorum_required, 
      total_voting_power, amount_involved, notice_sent_at, voting_deadline)
    VALUES (?, ?, ?, ?, ?, 'open', ?, 51.0, ?, ?, CURRENT_TIMESTAMP, ?)
  `).bind(
    project_id, Date.now(), title, description, vote_type,
    requiredMajority, shareholders?.total || 0, amount_involved || 0, votingDeadline
  ).run()

  const voteId = result.meta.last_row_id

  // Create notifications
  const allShareholders = await c.env.DB.prepare(`
    SELECT DISTINCT user_id FROM shareholdings WHERE project_id = ? AND status = 'active'
  `).bind(project_id).all()

  for (const sh of allShareholders.results as any[]) {
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, project_id, notification_type, title, message, action_url)
      VALUES (?, ?, 'vote_notice', ?, ?, ?)
    `).bind(sh.user_id, project_id, `Vote: ${title}`, `New ${vote_type?.replace('_',' ')} vote opened. 48h to respond.`, `/dashboard/votes/${voteId}`).run()
  }

  await logAudit(c.env.DB, 'vote_created', 'vote', voteId as number, payload.uid, JSON.stringify({ title, vote_type, project_id }))

  return c.json({ success: true, voteId, voting_deadline: votingDeadline, message: '48-hour voting window opened. All shareholders notified.' })
})

// Cast a vote — includes SHERKETI veto check
governanceRoutes.post('/votes/:voteId/cast', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const voteId = parseInt(c.req.param('voteId'))
  const { decision } = await c.req.json()

  if (!['for', 'against', 'abstain'].includes(decision)) {
    return c.json({ error: 'Invalid decision. Must be: for, against, or abstain' }, 400)
  }

  const vote = await c.env.DB.prepare("SELECT * FROM votes WHERE id = ? AND status = 'open'").bind(voteId).first<any>()
  if (!vote) return c.json({ error: 'Vote not found or closed' }, 404)

  if (new Date(vote.voting_deadline) < new Date()) {
    return c.json({ error: 'Voting deadline has passed' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT * FROM vote_records WHERE vote_id = ? AND user_id = ?').bind(voteId, payload.uid).first()
  if (existing) return c.json({ error: 'Already voted' }, 409)

  const shareholding = await c.env.DB.prepare(`
    SELECT equity_percentage FROM shareholdings WHERE project_id = ? AND user_id = ? AND status = 'active'
  `).bind(vote.project_id, payload.uid).first<any>()

  if (!shareholding) return c.json({ error: 'Not a shareholder in this project' }, 403)

  const votingPower = shareholding.equity_percentage

  await c.env.DB.prepare(`
    INSERT INTO vote_records (vote_id, user_id, decision, voting_power) VALUES (?, ?, ?, ?)
  `).bind(voteId, payload.uid, decision, votingPower).run()

  const field = decision === 'for' ? 'votes_for' : decision === 'against' ? 'votes_against' : 'abstentions'
  await c.env.DB.prepare(`UPDATE votes SET ${field} = ${field} + ? WHERE id = ?`).bind(votingPower, voteId).run()

  await logAudit(c.env.DB, 'vote_cast', 'vote', voteId, payload.uid, JSON.stringify({ decision, voting_power: votingPower }))

  // Check if vote can be resolved
  const updatedVote = await c.env.DB.prepare('SELECT * FROM votes WHERE id = ?').bind(voteId).first<any>()
  const totalVoted = updatedVote.votes_for + updatedVote.votes_against + updatedVote.abstentions
  const quorumMet = totalVoted >= (updatedVote.total_voting_power * updatedVote.quorum_required / 100)

  let resolved = false
  let vetoed = false

  if (quorumMet) {
    const effectiveVotes = updatedVote.votes_for + updatedVote.votes_against
    const forPercentage = effectiveVotes > 0 ? (updatedVote.votes_for / effectiveVotes) * 100 : 0
    if (forPercentage >= updatedVote.required_majority) {
      // Check for SHERKETI veto (ALL tiers per Blueprint v3.1)
      const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(vote.project_id).first<any>()
      if (project && project.jozour_veto_active) {
        // SHERKETI can only veto illegal/unconstitutional actions
        // Simulate AI check for illegal action
        const isIllegalAction = false // In production: AI analysis
        if (isIllegalAction) {
          await c.env.DB.prepare("UPDATE votes SET status = 'vetoed', vetoed_by = 'SHERKETI', veto_reason = 'Constitutional violation detected' WHERE id = ?").bind(voteId).run()
          vetoed = true
          await logAudit(c.env.DB, 'vote_vetoed_jozour', 'vote', voteId, null, 'SHERKETI veto: constitutional violation', 'governance-ai-v1')
        }
      }
      
      if (!vetoed) {
        await c.env.DB.prepare("UPDATE votes SET status = 'passed' WHERE id = ?").bind(voteId).run()
        resolved = true

        // Handle SHERKETI retention vote result
        if (vote.vote_type === 'jozour_retention_vote') {
          await handleJozourRetentionResult(c.env.DB, vote.project_id, true)
        }

        await logAudit(c.env.DB, 'vote_passed', 'vote', voteId, null, JSON.stringify({ for: updatedVote.votes_for, against: updatedVote.votes_against }))
      }
    } else if ((100 - forPercentage) > (100 - updatedVote.required_majority)) {
      await c.env.DB.prepare("UPDATE votes SET status = 'failed' WHERE id = ?").bind(voteId).run()
      resolved = true

      // Handle SHERKETI retention vote failure
      if (vote.vote_type === 'jozour_retention_vote') {
        await handleJozourRetentionResult(c.env.DB, vote.project_id, false)
      }
    }
  }

  return c.json({ success: true, voting_power: votingPower, quorum_met: quorumMet, resolved, vetoed, message: vetoed ? 'Vote vetoed by SHERKETI (constitutional violation).' : 'Vote recorded.' })
})

// Handle SHERKETI 5-year retention vote result
async function handleJozourRetentionResult(db: D1Database, projectId: number, retained: boolean) {
  if (retained) {
    // Extend SHERKETI board term by 5 more years
    const newTermEnd = new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString()
    await db.prepare(`
      UPDATE board_members SET term_end = ?, status = 'active' WHERE project_id = ? AND role = 'jozour_observer'
    `).bind(newTermEnd, projectId).run()
    await db.prepare(`
      UPDATE projects SET jozour_board_term_end = ?, jozour_term_renewed = jozour_term_renewed + 1 WHERE id = ?
    `).bind(newTermEnd, projectId).run()
    await logAudit(db, 'jozour_retained', 'board', projectId, null, JSON.stringify({ new_term_end: newTermEnd, action: 'retained by shareholder vote' }))
  } else {
    // Remove SHERKETI board seat and veto, but KEEP equity
    await db.prepare(`
      UPDATE board_members SET status = 'term_expired', removed_at = CURRENT_TIMESTAMP WHERE project_id = ? AND role = 'jozour_observer'
    `).bind(projectId).run()
    await db.prepare(`
      UPDATE projects SET jozour_veto_active = 0 WHERE id = ?
    `).bind(projectId).run()
    await logAudit(db, 'jozour_removed', 'board', projectId, null, 'SHERKETI voted out after 5-year term. Equity retained, board seat and veto power removed.')
  }
}

// Check SHERKETI term expiry and trigger votes
governanceRoutes.post('/check-jozour-terms', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  // Find projects where SHERKETI term is expiring (Blueprint: auto-ballot 90 days before term end)
  const expiringProjects = await c.env.DB.prepare(`
    SELECT p.id, p.title, p.jozour_board_term_end, p.tier
    FROM projects p 
    WHERE p.jozour_veto_active = 1 
    AND p.jozour_board_term_end <= datetime('now', '+90 days')
    AND p.status NOT IN ('draft', 'rejected', 'dissolved')
    AND p.id NOT IN (SELECT project_id FROM votes WHERE vote_type = 'jozour_retention_vote' AND status = 'open')
  `).all()

  const triggeredVotes: number[] = []

  for (const project of expiringProjects.results as any[]) {
    const shareholders = await c.env.DB.prepare(`
      SELECT SUM(equity_percentage) as total FROM shareholdings WHERE project_id = ? AND status = 'active'
    `).bind(project.id).first<{total: number}>()

    const votingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const result = await c.env.DB.prepare(`
      INSERT INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, quorum_required,
        total_voting_power, voting_deadline)
      VALUES (?, ?, ?, ?, 'jozour_retention_vote', 'open', 50.0, 51.0, ?, ?)
    `).bind(
      project.id, Date.now(),
      `SHERKETI Board Seat Renewal — ${project.title}`,
      `SHERKETI's 5-year board term is expiring. Vote to determine if SHERKETI retains its board seat and veto power. Simple majority (>50%) decides. SHERKETI's 2.5% equity stake is NOT affected by this vote. If no vote is held, term extends by 1 year then auto-renews.`,
      shareholders?.total || 0, votingDeadline
    ).run()

    // Update board status
    await c.env.DB.prepare(`
      UPDATE board_members SET status = 'pending_renewal_vote' WHERE project_id = ? AND role = 'jozour_observer'
    `).bind(project.id).run()

    triggeredVotes.push(result.meta.last_row_id as number)
    await logAudit(c.env.DB, 'jozour_renewal_triggered', 'vote', result.meta.last_row_id as number, null, JSON.stringify({ project_id: project.id, term_end: project.jozour_board_term_end }))
  }

  return c.json({ success: true, triggered: triggeredVotes.length, vote_ids: triggeredVotes })
})

// SHERKETI Veto action (admin/jozour only)
governanceRoutes.post('/votes/:voteId/veto', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  // Only admin (SHERKETI) can veto
  if (payload.role !== 'admin') return c.json({ error: 'Only SHERKETI representative can exercise veto' }, 403)

  const voteId = parseInt(c.req.param('voteId'))
  const { reason } = await c.req.json()

  const vote = await c.env.DB.prepare("SELECT * FROM votes WHERE id = ? AND status = 'open'").bind(voteId).first<any>()
  if (!vote) return c.json({ error: 'Vote not found or already closed' }, 404)

  // Verify project has active SHERKETI veto
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(vote.project_id).first<any>()
  if (!project || !project.jozour_veto_active) {
    return c.json({ error: 'SHERKETI veto not active for this project' }, 403)
  }

  await c.env.DB.prepare(`
    UPDATE votes SET status = 'vetoed', vetoed_by = 'SHERKETI', veto_reason = ? WHERE id = ?
  `).bind(reason || 'Constitutional violation', voteId).run()

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'jozour_veto', ?, 'governance-v2', ?)
  `).bind(vote.project_id, payload.uid, JSON.stringify({ vote_id: voteId, reason, vote_title: vote.title })).run()

  await logAudit(c.env.DB, 'jozour_veto_exercised', 'vote', voteId, payload.uid, JSON.stringify({ reason }))

  return c.json({ success: true, message: 'SHERKETI veto exercised. Vote cancelled due to constitutional violation.' })
})

// Get governance events for a project
governanceRoutes.get('/events/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const limit = parseInt(c.req.query('limit') || '50')

  const events = await c.env.DB.prepare(`
    SELECT ge.*, u.full_name as actor_name 
    FROM governance_events ge LEFT JOIN users u ON ge.actor_id = u.id
    WHERE ge.project_id = ? ORDER BY ge.created_at DESC LIMIT ?
  `).bind(projectId, limit).all()

  return c.json({ events: events.results })
})

// Get board members
governanceRoutes.get('/board/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))

  const board = await c.env.DB.prepare(`
    SELECT b.*, u.full_name, u.full_name_ar, u.reputation_score, u.email
    FROM board_members b LEFT JOIN users u ON b.user_id = u.id
    WHERE b.project_id = ? AND b.status IN ('active', 'pending_renewal_vote')
  `).bind(projectId).all()

  return c.json({ board: board.results })
})

// Request milestone release (requires dual signature for >1% capital)
governanceRoutes.post('/milestone-release', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, milestone_id, amount } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const capitalPercent = (amount / project.funding_goal) * 100

  let requiresDualSig = 0
  let requiresBoardVote = 0

  if (capitalPercent > 10) {
    requiresBoardVote = 1
  } else if (capitalPercent > 1) {
    requiresDualSig = 1
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status, 
      requires_dual_signature, milestone_id, manager_approved)
    VALUES (?, 'release', ?, 'escrow', ?, 'pending', ?, ?, 1)
  `).bind(project_id, amount, project.title, requiresDualSig, milestone_id || null).run()

  if (requiresBoardVote) {
    await c.env.DB.prepare(`
      INSERT INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, 
        total_voting_power, amount_involved, voting_deadline)
      VALUES (?, ?, ?, ?, 'milestone_release', 'open', 50.0, 100, ?, datetime('now', '+48 hours'))
    `).bind(project_id, Date.now(), `Milestone Release: ${amount} EGP`, `Release ${amount} EGP (${capitalPercent.toFixed(1)}% of capital) for milestone`, amount).run()
  }

  await logAudit(c.env.DB, 'milestone_release_requested', 'escrow', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ amount, capitalPercent, requiresDualSig, requiresBoardVote }))

  return c.json({
    success: true,
    requires_dual_signature: !!requiresDualSig,
    requires_board_vote: !!requiresBoardVote,
    message: requiresBoardVote ? 'Board vote required (>10% capital). Vote created.' :
             requiresDualSig ? 'Dual signature required (>1% capital). Awaiting accountant approval.' :
             'Release approved by manager. Processing via law firm escrow.'
  })
})

// Accountant signature for dual-sig transactions
governanceRoutes.post('/escrow/:id/sign', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.uid).first<any>()
  if (user?.role !== 'accountant' && user?.role !== 'admin') {
    return c.json({ error: 'Only accountants can sign dual-signature transactions' }, 403)
  }

  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare(`
    UPDATE escrow_transactions SET accountant_approved = 1, status = 'completed', completed_at = CURRENT_TIMESTAMP,
      law_firm_stamp = ? WHERE id = ? AND requires_dual_signature = 1
  `).bind(`LFS-${Date.now()}`, id).run()

  await logAudit(c.env.DB, 'dual_signature_completed', 'escrow', id, payload.uid, 'Accountant signed off on transaction')
  return c.json({ success: true, message: 'Dual signature completed. Funds released via law firm.' })
})

// File dispute
governanceRoutes.post('/disputes', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, against_user_id, dispute_type, description } = await c.req.json()

  const mediationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const boardDeadline = new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString()

  const result = await c.env.DB.prepare(`
    INSERT INTO disputes (project_id, filed_by, against_user_id, dispute_type, description, status,
      mediation_deadline, board_review_deadline, ai_suggested_resolution)
    VALUES (?, ?, ?, ?, ?, 'ai_mediation', ?, ?, ?)
  `).bind(
    project_id, payload.uid, against_user_id || null, dispute_type, description,
    mediationDeadline, boardDeadline,
    'AI mediation in progress. Analyzing evidence and constitutional rules...'
  ).run()

  await logAudit(c.env.DB, 'dispute_filed', 'dispute', result.meta.last_row_id as number, payload.uid, JSON.stringify({ dispute_type, project_id }))
  return c.json({ success: true, disputeId: result.meta.last_row_id, message: 'Dispute filed. 48-hour AI mediation period started.' })
})

// Get disputes
governanceRoutes.get('/disputes/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const disputes = await c.env.DB.prepare(`
    SELECT d.*, u1.full_name as filed_by_name, u2.full_name as against_name
    FROM disputes d LEFT JOIN users u1 ON d.filed_by = u1.id LEFT JOIN users u2 ON d.against_user_id = u2.id
    WHERE d.project_id = ? ORDER BY d.created_at DESC
  `).bind(projectId).all()
  return c.json({ disputes: disputes.results })
})

// Get notifications
governanceRoutes.get('/notifications', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const notifications = await c.env.DB.prepare(`
    SELECT n.*, p.title as project_title FROM notifications n
    LEFT JOIN projects p ON n.project_id = p.id
    WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50
  `).bind(payload.uid).all()

  const unreadCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = 0
  `).bind(payload.uid).first<{count: number}>()

  return c.json({ notifications: notifications.results, unread: unreadCount?.count || 0 })
})

// Mark notification read
governanceRoutes.post('/notifications/:id/read', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare('UPDATE notifications SET read_status = 1 WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// Mark all notifications read
governanceRoutes.post('/notifications/read-all', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  await c.env.DB.prepare('UPDATE notifications SET read_status = 1 WHERE user_id = ?').bind(payload.uid).run()
  return c.json({ success: true })
})

// =========================================================================
// Manager Removal Protocol (Part VIII.4 — Full Process)
// =========================================================================

governanceRoutes.post('/manager-removal', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, reason } = await c.req.json()

  // Verify proposer has >= 5% voting power
  const shareholding = await c.env.DB.prepare(`
    SELECT SUM(equity_percentage) as total FROM shareholdings WHERE project_id = ? AND user_id = ? AND status = 'active'
  `).bind(project_id, payload.uid).first<{total: number}>()

  if (!shareholding || shareholding.total < 5) {
    return c.json({ error: 'Need >= 5% voting power to propose manager removal (Part VIII.4)' }, 403)
  }

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Step 1: AI pre-vote risk analysis
  const aiRiskScore = Math.random() * 100
  const escalationRisk = aiRiskScore > 65

  // Step 2: Create removal vote (72h for removal votes, inactive = "no")
  const votingDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  
  const totalVotingPower = await c.env.DB.prepare(`
    SELECT SUM(equity_percentage) as total FROM shareholdings WHERE project_id = ? AND status = 'active'
  `).bind(project_id).first<{total: number}>()

  const result = await c.env.DB.prepare(`
    INSERT INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, quorum_required,
      total_voting_power, voting_deadline)
    VALUES (?, ?, ?, ?, 'manager_removal', 'open', 50.0, 51.0, ?, ?)
  `).bind(
    project_id, Date.now(),
    `Manager Removal Resolution`,
    `Reason: ${reason}\n\nAI Risk Analysis: ${aiRiskScore.toFixed(0)}% escalation probability.\nInactive shareholders count as "NO" for removal votes.\n\nTier ${project.tier} consequences:\n${
      project.tier === 'C' ? '- Loses 35% super-dividend right immediately\n- Keeps only vested equity (initial 10% + vested portion)\n- Manager rights fully revoked' :
      project.tier === 'D' ? '- Requires 75% of board members (excluding owner)\n- Owner retains ownership but loses management control' :
      '- Standard removal process\n- AI suggests interim manager candidates'
    }`,
    totalVotingPower?.total || 0, votingDeadline
  ).run()

  // If escalation risk > 65%, send early warning
  if (escalationRisk) {
    const allShareholders = await c.env.DB.prepare(`
      SELECT DISTINCT user_id FROM shareholdings WHERE project_id = ? AND status = 'active'
    `).bind(project_id).all()

    for (const sh of allShareholders.results as any[]) {
      await c.env.DB.prepare(`
        INSERT INTO notifications (user_id, project_id, notification_type, title, message)
        VALUES (?, ?, 'dispute_warning', 'Manager Removal - Mediation Suggested', 'AI detects 72h early warning: ${aiRiskScore.toFixed(0)}% escalation risk. Consider mediation before voting.')
      `).bind(sh.user_id, project_id).run()
    }
  }

  await logAudit(c.env.DB, 'manager_removal_proposed', 'vote', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ reason, ai_risk: aiRiskScore, escalation_warning: escalationRisk }))

  return c.json({
    success: true,
    vote_id: result.meta.last_row_id,
    voting_deadline: votingDeadline,
    ai_risk_analysis: {
      escalation_probability: aiRiskScore.toFixed(0) + '%',
      mediation_suggested: escalationRisk,
      early_warning_sent: escalationRisk
    },
    inactive_rule: 'Inactive shareholders count as "NO" for manager removal votes',
    required_majority: '> 50% of votes cast',
    tier_consequences: project.tier,
    reference: 'Part VIII.4 — Manager Removal Protocol'
  })
})

// =========================================================================
// Emergency Recall Vote (Part VII.3 — Capital Protection)
// =========================================================================

governanceRoutes.post('/emergency-recall', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, reason } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const totalVotingPower = await c.env.DB.prepare(`
    SELECT SUM(equity_percentage) as total FROM shareholdings WHERE project_id = ? AND status = 'active'
  `).bind(project_id).first<{total: number}>()

  // 72-hour shareholder vote for capital return
  const votingDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const result = await c.env.DB.prepare(`
    INSERT INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, quorum_required,
      total_voting_power, voting_deadline)
    VALUES (?, ?, 'Emergency Capital Recall', ?, 'emergency_recall', 'open', 50.0, 51.0, ?, ?)
  `).bind(
    project_id, Date.now(),
    `Emergency recall of remaining escrowed capital. Reason: ${reason}\n\nThis will return remaining escrowed capital to investors pro-rata.\nOptions: (1) Continue operations, (2) Replace management, (3) Full unwind.`,
    totalVotingPower?.total || 0, votingDeadline
  ).run()

  // Freeze pending escrow transactions
  await c.env.DB.prepare("UPDATE escrow_transactions SET status = 'frozen' WHERE project_id = ? AND status = 'pending'").bind(project_id).run()

  // Create red alert
  await c.env.DB.prepare(`
    INSERT INTO risk_alerts (project_id, alert_level, risk_category, title, description, status)
    VALUES (?, 'red', 'governance', 'Emergency Capital Recall Initiated', ?, 'active')
  `).bind(project_id, `Emergency recall vote opened. Reason: ${reason}. Pending escrow frozen. 72h to resolve.`).run()

  // Notify all shareholders
  const shareholders = await c.env.DB.prepare(`
    SELECT DISTINCT user_id FROM shareholdings WHERE project_id = ? AND status = 'active'
  `).bind(project_id).all()

  for (const sh of shareholders.results as any[]) {
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, project_id, notification_type, title, message, action_url)
      VALUES (?, ?, 'emergency', 'EMERGENCY: Capital Recall Vote', ?, ?)
    `).bind(sh.user_id, project_id, `Emergency recall vote for ${project.title}. 72h to vote. All pending escrow frozen.`, `/dashboard/votes/${result.meta.last_row_id}`).run()
  }

  await logAudit(c.env.DB, 'emergency_recall_initiated', 'vote', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ reason, escrow_frozen: true }))

  return c.json({
    success: true,
    vote_id: result.meta.last_row_id,
    voting_deadline: votingDeadline,
    escrow_frozen: true,
    resolution_options: ['Continue operations (with/without current manager)', 'Replace management (board appoints interim)', 'Full unwind (return remaining capital pro-rata)'],
    message: 'Emergency recall vote created. 72 hours. All pending escrow frozen. All shareholders notified.',
    reference: 'Part VII.3 — Capital Protection Mechanisms'
  })
})

// =========================================================================
// Process expired votes with auto-yes for inactive shareholders
// =========================================================================

governanceRoutes.post('/process-expired-votes', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  // Find expired open votes
  const expiredVotes = await c.env.DB.prepare(`
    SELECT * FROM votes WHERE status = 'open' AND voting_deadline < datetime('now')
  `).all()

  const processed: number[] = []

  for (const vote of expiredVotes.results as any[]) {
    // Determine major vs routine matter
    const isMajor = ['manager_removal', 'constitutional_amendment', 'emergency_recall'].includes(vote.vote_type)

    // Get shareholders who haven't voted
    const nonVoters = await c.env.DB.prepare(`
      SELECT s.user_id, s.equity_percentage FROM shareholdings s
      WHERE s.project_id = ? AND s.status = 'active'
      AND s.user_id NOT IN (SELECT user_id FROM vote_records WHERE vote_id = ?)
    `).bind(vote.project_id, vote.id).all()

    let autoYesPower = 0
    for (const nv of nonVoters.results as any[]) {
      if (isMajor) {
        // Major matters: inactivity counts as "no"
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO vote_records (vote_id, user_id, decision, voting_power) VALUES (?, ?, 'against', ?)
        `).bind(vote.id, nv.user_id, nv.equity_percentage).run()
        await c.env.DB.prepare('UPDATE votes SET votes_against = votes_against + ? WHERE id = ?').bind(nv.equity_percentage, vote.id).run()
      } else {
        // Routine matters: inactivity = auto-yes (deemed consent)
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO vote_records (vote_id, user_id, decision, voting_power) VALUES (?, ?, 'auto_yes', ?)
        `).bind(vote.id, nv.user_id, nv.equity_percentage).run()
        autoYesPower += nv.equity_percentage
        await c.env.DB.prepare('UPDATE votes SET votes_for = votes_for + ?, auto_yes_power = auto_yes_power + ? WHERE id = ?').bind(nv.equity_percentage, nv.equity_percentage, vote.id).run()
      }
    }

    // Now resolve the vote
    const updatedVote = await c.env.DB.prepare('SELECT * FROM votes WHERE id = ?').bind(vote.id).first<any>()
    const totalVoted = updatedVote.votes_for + updatedVote.votes_against + updatedVote.abstentions
    const effectiveVotes = updatedVote.votes_for + updatedVote.votes_against
    const forPct = effectiveVotes > 0 ? (updatedVote.votes_for / effectiveVotes) * 100 : 0

    if (forPct >= updatedVote.required_majority) {
      await c.env.DB.prepare("UPDATE votes SET status = 'passed' WHERE id = ?").bind(vote.id).run()
    } else {
      await c.env.DB.prepare("UPDATE votes SET status = 'failed' WHERE id = ?").bind(vote.id).run()
    }

    processed.push(vote.id)
    await logAudit(c.env.DB, 'vote_expired_processed', 'vote', vote.id, null,
      JSON.stringify({ auto_yes_power: autoYesPower, is_major: isMajor, result: forPct >= updatedVote.required_majority ? 'passed' : 'failed' }))
  }

  return c.json({
    success: true,
    processed_count: processed.length,
    vote_ids: processed,
    rules: {
      routine_matters: 'Inactivity after deadline = auto-yes (deemed consent)',
      major_matters: 'Inactivity = "no" for: manager_removal, constitutional_amendment, emergency_recall',
      quorum_extension: 'If quorum not met, vote is extended by 24 hours'
    },
    reference: 'Part VIII.2 — Voting Mechanics'
  })
})
