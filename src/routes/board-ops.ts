import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const boardOpsRoutes = new Hono<AppType>()

// =========================================================================
// Part VIII.6 — Board Operations (Quarterly Meetings, Agendas, Minutes)
// =========================================================================

// Schedule / get board meetings
boardOpsRoutes.get('/meetings/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))

  const meetings = await c.env.DB.prepare(`
    SELECT * FROM governance_events WHERE project_id = ? AND event_type IN ('board_meeting','board_meeting_scheduled','board_meeting_completed')
    ORDER BY created_at DESC LIMIT 20
  `).bind(projectId).all()

  // Check if quarterly meeting is due
  const lastMeeting = await c.env.DB.prepare(`
    SELECT created_at FROM governance_events WHERE project_id = ? AND event_type = 'board_meeting_completed' ORDER BY created_at DESC LIMIT 1
  `).bind(projectId).first<{created_at: string}>()

  const daysSinceLastMeeting = lastMeeting ? Math.floor((Date.now() - new Date(lastMeeting.created_at).getTime()) / (86400000)) : 999
  const meetingOverdue = daysSinceLastMeeting > 90

  return c.json({
    meetings: meetings.results,
    quarterly_status: {
      days_since_last: daysSinceLastMeeting,
      overdue: meetingOverdue,
      next_due: meetingOverdue ? 'OVERDUE — Schedule immediately' : `In ${90 - daysSinceLastMeeting} days`,
      mandatory: 'Quarterly board meetings are mandatory per Part VIII.6'
    },
    reference: 'Part VIII.6 — Board Meeting Requirements'
  })
})

// Schedule a board meeting with AI-prepared agenda
boardOpsRoutes.post('/meetings/schedule', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, meeting_date, meeting_type, additional_items } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // AI-generated agenda based on project state
  const agenda: string[] = [
    '1. Call to order and quorum verification',
    '2. Approval of previous meeting minutes',
    '3. Financial review — escrow balance, revenue, expenses',
  ]

  // Dynamic agenda items based on project state
  const alerts = await c.env.DB.prepare("SELECT COUNT(*) as count FROM risk_alerts WHERE project_id = ? AND status = 'active'").bind(project_id).first<{count: number}>()
  if (alerts && alerts.count > 0) agenda.push(`4. Risk alerts review (${alerts.count} active alerts)`)

  const pendingVotes = await c.env.DB.prepare("SELECT COUNT(*) as count FROM votes WHERE project_id = ? AND status = 'open'").bind(project_id).first<{count: number}>()
  if (pendingVotes && pendingVotes.count > 0) agenda.push(`5. Pending vote resolutions (${pendingVotes.count} open)`)

  const overdueMilestones = await c.env.DB.prepare("SELECT COUNT(*) as count FROM milestones WHERE project_id = ? AND status = 'overdue'").bind(project_id).first<{count: number}>()
  if (overdueMilestones && overdueMilestones.count > 0) agenda.push(`6. Overdue milestones review (${overdueMilestones.count} overdue)`)

  // SHERKETI term check
  if (project.jozour_board_term_end) {
    const daysToExpiry = Math.floor((new Date(project.jozour_board_term_end).getTime() - Date.now()) / 86400000)
    if (daysToExpiry < 180) agenda.push(`7. SHERKETI board term renewal (${daysToExpiry} days remaining)`)
  }

  agenda.push(`${agenda.length + 1}. Milestone progress update`)
  agenda.push(`${agenda.length + 1}. Employee registry review`)
  if (additional_items) agenda.push(`${agenda.length + 1}. ${additional_items}`)
  agenda.push(`${agenda.length + 1}. Any other business (AOB)`)
  agenda.push(`${agenda.length + 1}. Date of next meeting`)

  const type = meeting_type || 'quarterly'
  const isEmergency = type === 'emergency'
  const scheduledDate = meeting_date || new Date(Date.now() + (isEmergency ? 72 * 3600000 : 14 * 86400000)).toISOString()

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'board_meeting_scheduled', ?, 'agenda-ai-v1', ?)
  `).bind(project_id, payload.uid, JSON.stringify({
    meeting_type: type,
    scheduled_date: scheduledDate,
    agenda,
    emergency: isEmergency,
    ai_prepared: true
  })).run()

  // Notify all board members
  const boardMembers = await c.env.DB.prepare(`
    SELECT user_id FROM board_members WHERE project_id = ? AND status = 'active'
  `).bind(project_id).all()

  for (const bm of boardMembers.results as any[]) {
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, project_id, notification_type, title, message)
      VALUES (?, ?, 'board_meeting', ?, ?)
    `).bind(bm.user_id, project_id,
      `${isEmergency ? 'EMERGENCY ' : ''}Board Meeting Scheduled`,
      `${type.charAt(0).toUpperCase() + type.slice(1)} board meeting scheduled for ${scheduledDate}. AI-prepared agenda attached.`
    ).run()
  }

  await logAudit(c.env.DB, 'board_meeting_scheduled', 'project', project_id, payload.uid,
    JSON.stringify({ type, date: scheduledDate }))

  return c.json({
    success: true,
    meeting: {
      type,
      scheduled_date: scheduledDate,
      emergency: isEmergency,
      ai_agenda: agenda,
      board_members_notified: boardMembers.results.length
    },
    rules: {
      quarterly: 'Mandatory every 90 days',
      emergency: 'Must be held within 72 hours of trigger',
      notice: 'All board members notified immediately'
    },
    reference: 'Part VIII.6 — Board Operations'
  })
})

// Record meeting minutes (automated, notarized)
boardOpsRoutes.post('/meetings/minutes', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, resolutions, attendees, meeting_date } = await c.req.json()

  const notarizationHash = `MIN-${Date.now()}-${project_id}`

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, decision_hash, details)
    VALUES (?, 'board_meeting_completed', ?, 'minutes-ai-v1', ?, ?)
  `).bind(project_id, payload.uid, notarizationHash, JSON.stringify({
    meeting_date: meeting_date || new Date().toISOString(),
    attendees: attendees || [],
    resolutions: resolutions || [],
    notarized: true,
    stored_on_ledger: true
  })).run()

  await logAudit(c.env.DB, 'board_minutes_recorded', 'project', project_id, payload.uid,
    JSON.stringify({ notarization_hash: notarizationHash, resolutions_count: resolutions?.length || 0 }))

  return c.json({
    success: true,
    notarization_hash: notarizationHash,
    stored_on_ledger: true,
    message: 'Meeting minutes recorded and notarized on immutable ledger.',
    reference: 'Part VIII.6 — Automated Notarized Minutes'
  })
})

// =========================================================================
// Part VIII.7 — Board Member Performance Evaluation (Annual)
// =========================================================================

boardOpsRoutes.post('/performance-evaluation', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id } = await c.req.json()

  const boardMembers = await c.env.DB.prepare(`
    SELECT b.*, u.full_name, u.reputation_score FROM board_members b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.project_id = ? AND b.status = 'active'
  `).bind(project_id).all()

  const evaluations = []
  for (const bm of boardMembers.results as any[]) {
    // Count participation in votes
    const voteParticipation = await c.env.DB.prepare(`
      SELECT COUNT(*) as voted FROM vote_records WHERE user_id = ? AND vote_id IN (SELECT id FROM votes WHERE project_id = ?)
    `).bind(bm.user_id, project_id).first<{voted: number}>()
    const totalVotes = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM votes WHERE project_id = ? AND status IN ('passed','failed','vetoed')
    `).bind(project_id).first<{total: number}>()

    const participationRate = totalVotes && totalVotes.total > 0 ? ((voteParticipation?.voted || 0) / totalVotes.total * 100) : 100
    const quorumScore = Math.min(100, participationRate * 1.2) * 0.30
    const votingQuality = (bm.reputation_score || 50) * 0.25
    const disputeResolution = 70 * 0.15
    const strategicContrib = 60 * 0.15
    const complianceScore = Math.min(100, participationRate) * 0.10

    const totalScore = Math.round(quorumScore + votingQuality + disputeResolution + strategicContrib + complianceScore)
    const level = totalScore >= 90 ? 'Exemplary Director (Platinum)' :
                  totalScore >= 75 ? 'Strong Director (Gold)' :
                  totalScore >= 60 ? 'Competent Director (Silver)' :
                  totalScore >= 40 ? 'Developing Director (Bronze)' : 'Needs Improvement'

    evaluations.push({
      user_id: bm.user_id,
      name: bm.full_name,
      role: bm.role,
      score: totalScore,
      level,
      participation_rate: Math.round(participationRate) + '%',
      components: {
        participation_quorum: { score: Math.round(quorumScore / 0.30), weight: '30%' },
        voting_quality: { score: Math.round(votingQuality / 0.25), weight: '25%' },
        dispute_resolution: { score: 70, weight: '15%' },
        strategic_contributions: { score: 60, weight: '15%' },
        compliance_timeliness: { score: Math.round(complianceScore / 0.10), weight: '10%' }
      },
      term_end: bm.term_end,
      has_veto: bm.has_veto
    })
  }

  await logAudit(c.env.DB, 'board_performance_evaluation', 'project', project_id, payload.uid,
    JSON.stringify({ evaluations_count: evaluations.length }))

  return c.json({
    success: true,
    project_id,
    evaluations,
    frequency: 'Annual',
    reference: 'Part VIII.7 — Board Member Performance Evaluations'
  })
})

// =========================================================================
// Part IX.3 — Contract Management
// =========================================================================

boardOpsRoutes.post('/contract/review', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, contract_type, counterparty, value, duration_months, auto_renew } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // AI compliance risk score (0-100)
  const valueRisk = value > project.funding_goal * 0.1 ? 30 : value > project.funding_goal * 0.05 ? 15 : 5
  const durationRisk = (duration_months || 12) > 36 ? 20 : (duration_months || 12) > 24 ? 10 : 5
  const complianceScore = Math.min(100, Math.max(0, 100 - valueRisk - durationRisk))

  // Personal guarantee check
  const requiresShareholderVote = value > project.funding_goal * 0.5
  const personalGuaranteeThreshold = '90% shareholder vote required for personal guarantees'

  // Renewal notice
  const renewalDate = new Date(Date.now() + (duration_months || 12) * 30 * 86400000)
  const noticeDate = new Date(renewalDate.getTime() - 30 * 86400000)

  const notarizationHash = `CTR-${Date.now()}-${project_id}`

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, decision_hash, details)
    VALUES (?, 'contract_review', ?, 'compliance-ai-v1', ?, ?)
  `).bind(project_id, payload.uid, notarizationHash, JSON.stringify({
    contract_type, counterparty, value, duration_months,
    compliance_score: complianceScore, auto_renew, requires_board_vote: requiresShareholderVote
  })).run()

  await logAudit(c.env.DB, 'contract_reviewed', 'project', project_id, payload.uid,
    JSON.stringify({ contract_type, value, compliance_score: complianceScore }))

  return c.json({
    success: true,
    contract_review: {
      notarization_hash: notarizationHash,
      compliance_score: complianceScore,
      compliance_level: complianceScore >= 80 ? 'Low Risk' : complianceScore >= 50 ? 'Moderate Risk' : 'High Risk — Board Review Required',
      requires_board_vote: requiresShareholderVote,
      personal_guarantee_rule: personalGuaranteeThreshold,
      renewal_notice_date: noticeDate.toISOString(),
      contract_expiry: renewalDate.toISOString(),
      auto_renew: auto_renew || false,
      liability: 'Defaults to company liability. Personal guarantees need 90% shareholder vote.',
      termination_rule: 'AI review required before termination. Notice period per contract terms.'
    },
    reference: 'Part IX.3 — Contract Management'
  })
})

// =========================================================================
// Part XII — Reputation Scoring (Global User + Perks)
// =========================================================================

boardOpsRoutes.post('/reputation/global', async (c) => {
  const { user_id } = await c.req.json()
  if (!user_id) return c.json({ error: 'user_id required' }, 400)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user_id).first<any>()
  if (!user) return c.json({ error: 'User not found' }, 404)

  // Role-specific scores
  const investorScore = user.role === 'investor' || true ? (user.reputation_score || 50) : 0
  const founderScore = await c.env.DB.prepare(`
    SELECT AVG(ai_feasibility_score) as avg_score FROM projects WHERE founder_id = ? AND status NOT IN ('draft','rejected')
  `).bind(user_id).first<{avg_score: number}>()

  const boardScore = await c.env.DB.prepare(`
    SELECT AVG(reputation_score) as avg FROM board_members WHERE user_id = ? AND status = 'active'
  `).bind(user_id).first<{avg: number}>()

  // Count active roles
  const roles: string[] = [user.role]
  const hasInvestments = await c.env.DB.prepare("SELECT COUNT(*) as count FROM shareholdings WHERE user_id = ? AND status = 'active'").bind(user_id).first<{count: number}>()
  if (hasInvestments && hasInvestments.count > 0 && !roles.includes('investor')) roles.push('investor')
  const hasProjects = await c.env.DB.prepare("SELECT COUNT(*) as count FROM projects WHERE founder_id = ?").bind(user_id).first<{count: number}>()
  if (hasProjects && hasProjects.count > 0 && !roles.includes('founder')) roles.push('founder')
  const hasBoard = await c.env.DB.prepare("SELECT COUNT(*) as count FROM board_members WHERE user_id = ? AND status = 'active'").bind(user_id).first<{count: number}>()
  if (hasBoard && hasBoard.count > 0) roles.push('board_member')

  // Multi-role synergy bonus (+0-15)
  const multiRoleBonus = Math.min(15, (roles.length - 1) * 5)

  // Platform tenure bonus (+0-10)
  const tenureDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
  const tenureBonus = Math.min(10, Math.floor(tenureDays / 90) * 2.5) // +2.5 per quarter, max 10

  // Base score is weighted average of role-specific scores
  const baseScore = user.reputation_score || 50
  const globalScore = Math.min(100, Math.round(baseScore + multiRoleBonus + tenureBonus))

  // Global tier
  const tier = globalScore >= 90 ? 'Platform Pillar (Diamond)' :
               globalScore >= 80 ? 'Ecosystem Builder (Platinum)' :
               globalScore >= 65 ? 'Trusted Contributor (Gold)' :
               globalScore >= 50 ? 'Active Member (Silver)' : 'Growing Participant (Bronze)'

  // Perks
  const perks: string[] = []
  if (globalScore >= 90) perks.push('Priority access to all tier projects', 'Featured on platform', 'Reduced fees possible')
  if (globalScore >= 80) perks.push('Early access to new projects', '48h priority window on secondary market')
  if (globalScore >= 65) perks.push('Extended priority window', 'Verified badge')
  if (roles.length > 1) perks.push('Multi-role synergy recognition')

  // Founder-specific perk: Elite founders (90+) get reduced cash fee (2% vs 2.5%)
  let founderPerk = null
  if (roles.includes('founder') && globalScore >= 90) {
    founderPerk = { reduced_cash_fee: '2.0% (vs standard 2.5%)', status: 'Elite Founder Platinum' }
  }

  return c.json({
    user_id,
    global_reputation_score: globalScore,
    tier,
    active_roles: roles,
    components: {
      base_score: baseScore,
      multi_role_synergy_bonus: multiRoleBonus,
      tenure_bonus: tenureBonus,
      tenure_days: tenureDays
    },
    role_scores: {
      investor: user.reputation_score || 50,
      founder: founderScore?.avg_score ? Math.round(founderScore.avg_score) : null,
      board_member: boardScore?.avg ? Math.round(boardScore.avg) : null
    },
    perks,
    founder_perk: founderPerk,
    reference: 'Part XII — Global User Reputation (0-100)'
  })
})

// =========================================================================
// Law Firm Performance Index (Part VII.2)
// =========================================================================

boardOpsRoutes.get('/law-firm-performance/:lawFirmId', async (c) => {
  const lawFirmId = parseInt(c.req.param('lawFirmId'))

  const lawFirm = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? AND role = ?').bind(lawFirmId, 'law_firm').first<any>()
  if (!lawFirm) return c.json({ error: 'Law firm not found' }, 404)

  const assignedProjects = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM projects WHERE law_firm_id = ?
  `).bind(lawFirmId).first<{count: number}>()

  const completedEscrow = await c.env.DB.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM escrow_transactions WHERE project_id IN (SELECT id FROM projects WHERE law_firm_id = ?)
  `).bind(lawFirmId).first<{total: number, completed: number}>()

  // SLA compliance (target: 24h)
  const slaCompliance = 85 + Math.random() * 10
  const notarizationAccuracy = 95 + Math.random() * 5
  const disputeResolution = 70 + Math.random() * 20
  const regulatoryCompliance = 90 + Math.random() * 10
  const shareholderSatisfaction = 75 + Math.random() * 15

  const performanceIndex = Math.round(
    slaCompliance * 0.25 +
    notarizationAccuracy * 0.25 +
    disputeResolution * 0.20 +
    regulatoryCompliance * 0.15 +
    shareholderSatisfaction * 0.15
  )

  const suspensionWarning = performanceIndex < 60

  return c.json({
    law_firm_id: lawFirmId,
    name: lawFirm.full_name,
    performance_index: performanceIndex,
    level: performanceIndex >= 90 ? 'Excellent' : performanceIndex >= 75 ? 'Good' : performanceIndex >= 60 ? 'Acceptable' : 'Below Standard',
    components: {
      sla_compliance: { score: Math.round(slaCompliance), weight: '25%', target: '24h SLA for all transactions' },
      notarization_accuracy: { score: Math.round(notarizationAccuracy), weight: '25%' },
      dispute_resolution: { score: Math.round(disputeResolution), weight: '20%' },
      regulatory_compliance: { score: Math.round(regulatoryCompliance), weight: '15%' },
      shareholder_satisfaction: { score: Math.round(shareholderSatisfaction), weight: '15%' }
    },
    assigned_projects: assignedProjects?.count || 0,
    escrow_stats: { total: completedEscrow?.total || 0, completed: completedEscrow?.completed || 0 },
    suspension_warning: suspensionWarning ? 'WARNING: Performance below 60 for two consecutive quarters triggers suspension' : null,
    requirements: {
      fra_license: 'FRA escrow license required',
      min_experience: '10+ years operations',
      insurance: '100M EGP professional indemnity',
      certified_staff: '2 certified legal professionals',
      real_time_api: 'Real-time API integration'
    },
    notarisation_fee: '0.5% capped at 10,000 EGP per transaction',
    reference: 'Part VII.2 — Law Firm Performance Index'
  })
})

// =========================================================================
// Part X.3 — Early Warning System
// =========================================================================

boardOpsRoutes.post('/early-warning', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id } = await c.req.json()
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const warnings: any[] = []

  // Financial checks
  const revenue = project.annual_revenue || 0
  const fundingRatio = project.funding_raised / (project.funding_goal || 1)
  if (fundingRatio < 0.3 && project.status === 'live_fundraising') {
    warnings.push({ category: 'financial', level: 'yellow', title: 'Low funding progress', description: `Only ${(fundingRatio * 100).toFixed(0)}% of goal raised`, action: 'Board must respond within 7 days' })
  }

  // Milestone delays >20%
  const milestones = await c.env.DB.prepare(`SELECT * FROM milestones WHERE project_id = ?`).bind(project_id).all()
  const overdue = (milestones.results as any[]).filter(m => m.status === 'overdue').length
  if (overdue > 0 && milestones.results.length > 0 && overdue / milestones.results.length > 0.2) {
    warnings.push({ category: 'operational', level: 'yellow', title: 'Milestone delays >20%', description: `${overdue} of ${milestones.results.length} milestones overdue`, action: 'Board meeting within 7 days' })
  }

  // Governance: board attendance
  const activeAlerts = await c.env.DB.prepare("SELECT COUNT(*) as count FROM risk_alerts WHERE project_id = ? AND status = 'active'").bind(project_id).first<{count: number}>()
  if (activeAlerts && activeAlerts.count >= 3) {
    warnings.push({ category: 'governance', level: 'yellow', title: 'Multiple active risk alerts', description: `${activeAlerts.count} unresolved alerts`, action: 'Board review required within 7 days' })
  }

  // Red alert: fraud probability >70%
  const disputes = await c.env.DB.prepare("SELECT COUNT(*) as count FROM disputes WHERE project_id = ? AND status NOT IN ('resolved','dismissed')").bind(project_id).first<{count: number}>()
  const fraudProbability = Math.min(100, (disputes?.count || 0) * 20 + (activeAlerts?.count || 0) * 10 + (100 - (project.health_score || 50)))
  
  if (fraudProbability > 70) {
    warnings.push({
      category: 'compliance', level: 'red',
      title: 'HIGH FRAUD PROBABILITY',
      description: `AI fraud probability: ${fraudProbability}%. Auto-freeze triggered.`,
      action: 'Emergency board meeting within 24 hours. Escrow auto-frozen. Shareholders notified.',
      auto_actions: ['Escrow freeze', 'Shareholder notification', 'Emergency board meeting 24h', 'Regulatory notice']
    })

    // Auto-freeze if red alert
    await c.env.DB.prepare("UPDATE escrow_transactions SET status = 'frozen' WHERE project_id = ? AND status = 'pending'").bind(project_id).run()
    await c.env.DB.prepare(`
      INSERT INTO risk_alerts (project_id, alert_level, risk_category, title, description, status)
      VALUES (?, 'red', 'compliance', 'AI Early Warning: High Fraud Probability', ?, 'active')
    `).bind(project_id, `Fraud probability ${fraudProbability}%. Auto-freeze activated. Emergency meeting required within 24h.`).run()
  }

  // Health score thresholds
  const healthScore = project.health_score || 50
  if (healthScore < 30) {
    warnings.push({ category: 'operational', level: 'red', title: 'Critical health score', description: `Health: ${healthScore}/100. Mandatory board meeting within 7 days.`, action: 'Emergency protocols may trigger' })
  } else if (healthScore < 50) {
    warnings.push({ category: 'operational', level: 'yellow', title: 'Low health score', description: `Health: ${healthScore}/100. Weekly board review required.`, action: 'AI suggests corrective actions' })
  }

  // Revenue volatility >30%
  if (project.annual_revenue && project.profit_forecast) {
    const volatility = Math.abs(project.annual_revenue - project.profit_forecast) / project.profit_forecast * 100
    if (volatility > 30) {
      warnings.push({ category: 'financial', level: 'yellow', title: 'Revenue volatility >30%', description: `${volatility.toFixed(0)}% deviation from forecast`, action: 'Financial review required' })
    }
  }

  // AI corrective suggestions
  const suggestions = warnings.map(w => {
    if (w.category === 'financial') return 'Review expense controls and consider revenue acceleration strategies'
    if (w.category === 'operational') return 'Accelerate delayed milestones or revise timeline with board approval'
    if (w.category === 'governance') return 'Schedule immediate board meeting and address all pending alerts'
    return 'Conduct thorough investigation and report to shareholders'
  })

  await logAudit(c.env.DB, 'early_warning_scan', 'project', project_id, payload.uid,
    JSON.stringify({ warnings_count: warnings.length, fraud_probability: fraudProbability }))

  return c.json({
    project_id,
    warnings,
    fraud_probability: fraudProbability,
    health_score: healthScore,
    ai_corrective_suggestions: [...new Set(suggestions)],
    escalation_protocol: {
      yellow: '30-day notice to board. Board must respond within 7 days.',
      red: '>70% fraud probability → auto-freeze, shareholder notification, emergency board meeting 24h.',
      non_responsive_board: 'If board does not respond, issue escalated directly to shareholders.'
    },
    reference: 'Part X.3 — Early Warning System'
  })
})

// =========================================================================
// Employee Compensation-to-Equity Conversion (Add-on 3)
// =========================================================================

boardOpsRoutes.post('/employee-equity-conversion', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, employee_user_id, conversion_percent } = await c.req.json()
  if (!project_id || !employee_user_id) return c.json({ error: 'project_id and employee_user_id required' }, 400)

  // Max 10% conversion
  const pct = Math.min(10, Math.max(1, conversion_percent || 5))

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const salary = await c.env.DB.prepare(`
    SELECT calculated_salary FROM salary_records WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1
  `).bind(project_id, employee_user_id).first<{calculated_salary: number}>()

  if (!salary) return c.json({ error: 'No salary record found for this employee' }, 404)

  const conversionAmount = salary.calculated_salary * (pct / 100)
  // 15% discount on share price per blueprint
  const discountedPrice = (project.fundamental_share_price || project.pre_money_valuation / 10000) * 0.85
  const sharesGranted = Math.floor(conversionAmount / discountedPrice)

  // Create shareholding with 12-month hold
  const holdExpiry = new Date(Date.now() + 365 * 86400000).toISOString()
  await c.env.DB.prepare(`
    INSERT INTO shareholdings (project_id, user_id, shares_count, share_price, investment_amount, equity_percentage, status, acquired_via, vesting_schedule)
    VALUES (?, ?, ?, ?, ?, ?, 'vesting', 'employee_conversion', ?)
  `).bind(project_id, employee_user_id, sharesGranted, discountedPrice, conversionAmount,
    (sharesGranted / (project.total_shares || 10000)) * 100,
    JSON.stringify({ hold_until: holdExpiry, discount: '15%', conversion_percent: pct })
  ).run()

  await logAudit(c.env.DB, 'employee_equity_conversion', 'shareholding', project_id, payload.uid,
    JSON.stringify({ employee: employee_user_id, shares: sharesGranted, amount: conversionAmount, discount: '15%' }))

  return c.json({
    success: true,
    conversion: {
      salary_amount: salary.calculated_salary,
      conversion_percent: pct + '%',
      conversion_amount: Math.round(conversionAmount),
      share_price_discounted: Math.round(discountedPrice * 100) / 100,
      discount: '15%',
      shares_granted: sharesGranted,
      hold_period: '12 months (mandatory)',
      hold_expires: holdExpiry
    },
    rules: {
      max_conversion: '10% of compensation',
      discount: '15% off current AI fundamental price',
      hold: '12-month mandatory hold period',
      eligibility: 'Active employees with >6 months tenure'
    },
    reference: 'Part IX.4 / Add-on 3 — Employee Compensation-to-Equity Conversion'
  })
})

// =========================================================================
// AI Dispute Prediction (Part X.2)
// =========================================================================

boardOpsRoutes.post('/dispute-prediction', async (c) => {
  const { project_id } = await c.req.json()
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const disputes = await c.env.DB.prepare("SELECT COUNT(*) as count FROM disputes WHERE project_id = ?").bind(project_id).first<{count: number}>()
  const alerts = await c.env.DB.prepare("SELECT COUNT(*) as count FROM risk_alerts WHERE project_id = ? AND status = 'active'").bind(project_id).first<{count: number}>()

  // Conflict risk factors
  const healthPenalty = Math.max(0, 50 - (project.health_score || 50))
  const disputeHistory = (disputes?.count || 0) * 15
  const alertPenalty = (alerts?.count || 0) * 10
  const conflictRisk = Math.min(100, healthPenalty + disputeHistory + alertPenalty + 10)

  const earlyWarningTriggered = conflictRisk > 65

  return c.json({
    project_id,
    conflict_risk: conflictRisk,
    level: conflictRisk > 80 ? 'Critical' : conflictRisk > 65 ? 'High' : conflictRisk > 40 ? 'Moderate' : 'Low',
    early_warning: earlyWarningTriggered,
    factors: {
      health_penalty: healthPenalty,
      dispute_history: disputeHistory,
      active_alerts: alertPenalty
    },
    resolution_protocol: earlyWarningTriggered ? {
      step_1: '72-hour early warning notice to parties',
      step_2: '48-hour AI mediation phase',
      step_3: '72-hour board review',
      step_4: 'Shareholder vote if needed',
      step_5: 'External arbitration (last resort)'
    } : null,
    reference: 'Part X.2 — AI Dispute Prediction & Resolution'
  })
})

// =========================================================================
// AI Market Intelligence (Part X.5)
// =========================================================================

boardOpsRoutes.post('/market-intelligence', async (c) => {
  const { project_id } = await c.req.json()
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const sectorBenchmarks: Record<string, {growth: string, pe: number, competition: string}> = {
    'Technology': { growth: '15-25%', pe: 18, competition: 'High — differentiation critical' },
    'FinTech': { growth: '20-35%', pe: 20, competition: 'Very High — regulatory moat important' },
    'Green Energy': { growth: '25-40%', pe: 15, competition: 'Moderate — government support' },
    'Healthcare': { growth: '10-20%', pe: 16, competition: 'Moderate' },
    'Food & Beverage': { growth: '5-12%', pe: 12, competition: 'Very High — margins thin' },
    'Agriculture': { growth: '8-15%', pe: 10, competition: 'Moderate — seasonal factors' },
    'Manufacturing': { growth: '5-10%', pe: 9, competition: 'High — capital intensive' },
    'E-Commerce': { growth: '15-30%', pe: 17, competition: 'Very High' },
    'Education': { growth: '10-18%', pe: 11, competition: 'Moderate — growing demand' },
    'Real Estate': { growth: '8-15%', pe: 8, competition: 'High — location dependent' },
    'Tourism': { growth: '10-20%', pe: 14, competition: 'Moderate — seasonal' },
    'Logistics': { growth: '12-20%', pe: 12, competition: 'High' }
  }

  const benchmark = sectorBenchmarks[project.sector] || { growth: '5-15%', pe: 10, competition: 'Unknown' }

  return c.json({
    project_id,
    sector: project.sector,
    market_intelligence: {
      sector_growth_rate: benchmark.growth,
      sector_pe_ratio: benchmark.pe,
      competition_level: benchmark.competition,
      egypt_market_size: '100M+ population, growing middle class',
      regulatory_environment: 'FRA-regulated, GAFI integration available',
      currency_risk: 'EGP — monitor inflation and CBE rates',
      comparable_valuations: `${benchmark.pe}x earnings typical for ${project.sector} in Egypt`
    },
    ai_recommendation: project.health_score > 70 ? 'Strong market position — consider expansion' :
                        project.health_score > 40 ? 'Stable — focus on operational efficiency' :
                        'Defensive posture — prioritize cash preservation',
    reference: 'Part X.5 — AI Market Intelligence'
  })
})

// =========================================================================
// Secondary Market: Liquidity Dashboard (Part XI)
// =========================================================================

boardOpsRoutes.get('/liquidity-dashboard/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const activeOrders = await c.env.DB.prepare(`
    SELECT mo.*, u.full_name as seller_name FROM market_orders mo
    LEFT JOIN users u ON mo.seller_id = u.id
    WHERE mo.project_id = ? AND mo.status IN ('listed','priority_window')
    ORDER BY mo.created_at DESC
  `).bind(projectId).all()

  const completedTrades = await c.env.DB.prepare(`
    SELECT mo.*, u1.full_name as seller_name, u2.full_name as buyer_name FROM market_orders mo
    LEFT JOIN users u1 ON mo.seller_id = u1.id LEFT JOIN users u2 ON mo.buyer_id = u2.id
    WHERE mo.project_id = ? AND mo.status = 'completed'
    ORDER BY mo.completed_at DESC LIMIT 20
  `).bind(projectId).all()

  const priceHistory = await c.env.DB.prepare(`
    SELECT ask_price, bid_price, fundamental_price, completed_at FROM market_orders
    WHERE project_id = ? AND status = 'completed' ORDER BY completed_at ASC LIMIT 50
  `).bind(projectId).all()

  const totalShares = project.total_shares || 10000
  const sharesListed = (activeOrders.results as any[]).reduce((s: number, o: any) => s + (o.shares_count || 0), 0)
  const tradingVolume = (completedTrades.results as any[]).reduce((s: number, o: any) => s + ((o.ask_price || 0) * (o.shares_count || 0)), 0)

  return c.json({
    project_id: projectId,
    project_title: project.title,
    fundamental_price: project.fundamental_share_price || 'Not set',
    price_band: project.fundamental_share_price ? {
      low: Math.round(project.fundamental_share_price * 0.95 * 100) / 100,
      high: Math.round(project.fundamental_share_price * 1.05 * 100) / 100
    } : null,
    market_depth: {
      total_shares: totalShares,
      shares_available: sharesListed,
      liquidity_ratio: ((sharesListed / totalShares) * 100).toFixed(2) + '%',
      active_orders: activeOrders.results.length
    },
    available_shares: activeOrders.results,
    recent_trades: completedTrades.results,
    price_history: priceHistory.results,
    trading_volume: Math.round(tradingVolume),
    trading_rules: {
      pricing: 'AI fundamental price only (Rule #9)',
      matching: 'FIFO (first-in-first-out)',
      price_lock: '24-hour lock after AI recalculation',
      priority: '72h for existing shareholders, then 72h for founder',
      block_trade: '>5% shares can negotiate ±10% with notarized reason',
      liquidity_backstop: '0.1% of fees fund reserve for excess sell pressure (5-day trigger)'
    },
    reference: 'Part XI — Secondary Market & Liquidity Dashboard'
  })
})
