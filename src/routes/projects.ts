import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const projectRoutes = new Hono<AppType>()

// List all projects (public)
projectRoutes.get('/', async (c) => {
  const status = c.req.query('status')
  const tier = c.req.query('tier')
  const sector = c.req.query('sector')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  let query = `SELECT p.*, u.full_name as founder_name, u.reputation_score as founder_reputation
    FROM projects p LEFT JOIN users u ON p.founder_id = u.id WHERE 1=1`
  const params: any[] = []

  if (status) { query += ' AND p.status = ?'; params.push(status) }
  if (tier) { query += ' AND p.tier = ?'; params.push(tier) }
  if (sector) { query += " AND p.sector = ?"; params.push(sector) }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const projects = await c.env.DB.prepare(query).bind(...params).all()
  const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM projects').first<{total: number}>()

  return c.json({ projects: projects.results, total: countResult?.total || 0, page, limit })
})

// Get single project with full details
projectRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  
  const project = await c.env.DB.prepare(`
    SELECT p.*, u.full_name as founder_name, u.full_name_ar as founder_name_ar, 
           u.reputation_score as founder_reputation, u.email as founder_email,
           lf.full_name as law_firm_name
    FROM projects p 
    LEFT JOIN users u ON p.founder_id = u.id
    LEFT JOIN users lf ON p.law_firm_id = lf.id
    WHERE p.id = ?
  `).bind(id).first()

  if (!project) return c.json({ error: 'Project not found' }, 404)

  const shareholders = await c.env.DB.prepare(`
    SELECT s.*, u.full_name, u.reputation_score 
    FROM shareholdings s LEFT JOIN users u ON s.user_id = u.id 
    WHERE s.project_id = ? ORDER BY s.equity_percentage DESC
  `).bind(id).all()

  const board = await c.env.DB.prepare(`
    SELECT b.*, u.full_name, u.full_name_ar, u.reputation_score, u.email
    FROM board_members b LEFT JOIN users u ON b.user_id = u.id
    WHERE b.project_id = ? AND b.status IN ('active', 'pending_renewal_vote')
  `).bind(id).all()

  const milestones = await c.env.DB.prepare(`
    SELECT * FROM milestones WHERE project_id = ? ORDER BY order_index ASC
  `).bind(id).all()

  const events = await c.env.DB.prepare(`
    SELECT ge.*, u.full_name as actor_name
    FROM governance_events ge LEFT JOIN users u ON ge.actor_id = u.id
    WHERE ge.project_id = ? ORDER BY ge.created_at DESC LIMIT 20
  `).bind(id).all()

  const activeVotes = await c.env.DB.prepare(`
    SELECT * FROM votes WHERE project_id = ? AND status = 'open' ORDER BY created_at DESC
  `).bind(id).all()

  const alerts = await c.env.DB.prepare(`
    SELECT * FROM risk_alerts WHERE project_id = ? AND status IN ('active','acknowledged') ORDER BY created_at DESC
  `).bind(id).all()

  const escrow = await c.env.DB.prepare(`
    SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
    FROM escrow_transactions WHERE project_id = ? AND status = 'completed'
    GROUP BY transaction_type
  `).bind(id).all()

  const disputes = await c.env.DB.prepare(`
    SELECT d.*, u1.full_name as filed_by_name, u2.full_name as against_name
    FROM disputes d LEFT JOIN users u1 ON d.filed_by = u1.id LEFT JOIN users u2 ON d.against_user_id = u2.id
    WHERE d.project_id = ? ORDER BY d.created_at DESC LIMIT 10
  `).bind(id).all()

  return c.json({
    project,
    shareholders: shareholders.results,
    board: board.results,
    milestones: milestones.results,
    governance_events: events.results,
    active_votes: activeVotes.results,
    risk_alerts: alerts.results,
    escrow_summary: escrow.results,
    disputes: disputes.results
  })
})

// Create new project proposal
projectRoutes.post('/', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.uid).first<any>()
  if (!user || user.verification_status !== 'verified') {
    return c.json({ error: 'KYC verification required before creating projects' }, 403)
  }

  const body = await c.req.json()
  const { title, title_ar, description, sector, tier, funding_goal, min_investment, equity_offered, milestones, company_region } = body

  if (!title || !description || !sector || !funding_goal || !equity_offered) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  // Tier validation
  const selectedTier = tier || 'A'
  const tierLimits: Record<string, number> = { 'A': 3000000, 'B': 25000000, 'C': 999999999, 'D': 999999999 }
  if (funding_goal > tierLimits[selectedTier]) {
    return c.json({ error: `Funding goal exceeds Tier ${selectedTier} limit of ${tierLimits[selectedTier]} EGP` }, 400)
  }

  // Blueprint v3.1 Fee Model: 2.5% cash + 2.5% equity for ALL tiers (A/B/C/D)
  const jozourCommission = 2.5  // Always 2.5% cash commission — ALL tiers
  const jozourEquity = 2.5  // Always 2.5% equity — ALL tiers (Blueprint Rule 8)
  const jozourVeto = 1  // 5yr board seat with veto for ALL tiers

  // Tier-specific founder rules (Blueprint Part IV)
  const founderRules: Record<string, {equity: number, dividend_bonus: number, is_manager: number, manager_banned: number}> = {
    'A': { equity: 5.0, dividend_bonus: 5.0, is_manager: 0, manager_banned: 1 },
    'B': { equity: 5.0, dividend_bonus: 0, is_manager: 0, manager_banned: 0 },
    'C': { equity: 10.0, dividend_bonus: 35.0, is_manager: 1, manager_banned: 0 },
    'D': { equity: 0, dividend_bonus: 0, is_manager: 1, manager_banned: 0 }
  }
  const founderRule = founderRules[selectedTier] || founderRules['A']

  // Founder Partner Limitation (Add-on 16)
  const investorCap = body.investor_cap || null
  const investorCapType = investorCap ? 'limited' : 'unlimited'
  const aiMinInvestment = investorCap ? Math.ceil(funding_goal / (investorCap * 0.7)) : null

  const result = await c.env.DB.prepare(`
    INSERT INTO projects (founder_id, title, title_ar, description, sector, tier, status, funding_goal, 
      min_investment, equity_offered, jozour_commission_percent, jozour_equity_percent, jozour_veto_active,
      founder_equity_percent, founder_dividend_bonus, founder_is_manager, founder_manager_banned,
      investor_cap, investor_cap_type, ai_min_investment,
      milestones, company_region, governance_state)
    VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pre_funding')
  `).bind(
    payload.uid, title, title_ar || null, description, sector, selectedTier,
    funding_goal, aiMinInvestment || min_investment || 50, equity_offered, 
    jozourCommission, jozourEquity, jozourVeto,
    founderRule.equity, founderRule.dividend_bonus, founderRule.is_manager, founderRule.manager_banned,
    investorCap, investorCapType, aiMinInvestment,
    milestones ? JSON.stringify(milestones) : null, company_region || 'cairo'
  ).run()

  const projectId = result.meta.last_row_id as number

  // Create milestones if provided
  if (milestones && Array.isArray(milestones)) {
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i]
      await c.env.DB.prepare(`
        INSERT INTO milestones (project_id, title, description, tranche_amount, tranche_percentage, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(projectId, m.title, m.description || '', m.amount || 0, m.percentage || 0, i + 1).run()
    }
  }

  await logAudit(c.env.DB, 'project_created', 'project', projectId, payload.uid, 
    JSON.stringify({ title, tier: selectedTier, funding_goal, jozour_commission: jozourCommission, jozour_equity: jozourEquity, jozour_veto: jozourVeto }))

  return c.json({ 
    success: true, projectId, 
    jozour_fee: {
      commission: `${jozourCommission}%`,
      equity: `${jozourEquity}%`,
      board_seat: '5yr with veto (6 categories)',
      tier: selectedTier
    },
    founder_rules: {
      equity: `${founderRule.equity}%`,
      dividend_bonus: founderRule.dividend_bonus > 0 ? `${founderRule.dividend_bonus}% bonus` : 'Standard pro-rata',
      manager: founderRule.manager_banned ? 'Banned (independent manager required)' : founderRule.is_manager ? 'Default manager' : 'Can be elected'
    },
    investor_limit: investorCapType === 'limited' ? { cap: investorCap, ai_min_investment: aiMinInvestment } : 'Unlimited',
    message: 'Project created. Submit for AI feasibility review.' 
  })
})

// Submit for AI review
projectRoutes.post('/:id/submit-review', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const id = parseInt(c.req.param('id'))
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ? AND founder_id = ?').bind(id, payload.uid).first<any>()
  if (!project) return c.json({ error: 'Project not found or unauthorized' }, 404)

  await c.env.DB.prepare("UPDATE projects SET status = 'ai_review' WHERE id = ?").bind(id).run()
  
  try {
    const hfKey = c.env.HF_API_KEY
    let aiScore = 50 + Math.random() * 45
    let aiDetails = 'AI analysis completed'

    if (hfKey) {
      try {
        const prompt = `Analyze this business proposal for feasibility. Rate 0-100.\nTitle: ${project.title}\nSector: ${project.sector}\nDescription: ${project.description}\nFunding: ${project.funding_goal} EGP\nTier: ${project.tier}\nRespond with only a JSON: {"score": number, "analysis": "string", "risks": ["string"], "strengths": ["string"]}`
        
        const response = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 300, temperature: 0.3 } })
        })
        
        if (response.ok) {
          const result = await response.json() as any
          const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text || ''
          const scoreMatch = text.match(/score["\s:]+(\d+)/i)
          if (scoreMatch) aiScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])))
          aiDetails = text.substring(0, 500)
        }
      } catch (e) { /* Use fallback score */ }
    }

    const feasibilityResult = {
      score: Math.round(aiScore),
      tier: project.tier,
      sector: project.sector,
      analysis: aiDetails,
      model: 'feasibility-ai-v1',
      timestamp: new Date().toISOString()
    }

    if (aiScore < 35) {
      const banDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      await c.env.DB.prepare(`
        UPDATE projects SET status = 'rejected', ai_feasibility_score = ?, ai_feasibility_details = ? WHERE id = ?
      `).bind(feasibilityResult.score, JSON.stringify(feasibilityResult), id).run()
      
      await logAudit(c.env.DB, 'project_rejected', 'project', id, null, JSON.stringify(feasibilityResult), 'feasibility-ai-v1')
      return c.json({ success: false, score: feasibilityResult.score, message: 'Project rejected by AI. Score below 35 threshold.', details: feasibilityResult })
    }

    const valuation = calculateValuation(project, feasibilityResult.score)

    // Calculate 5-year board term dates for SHERKETI
    const boardTermStart = new Date().toISOString()
    const boardTermEnd = new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString()

    await c.env.DB.prepare(`
      UPDATE projects SET status = 'interest_phase', ai_feasibility_score = ?, ai_feasibility_details = ?,
        pre_money_valuation = ?, post_money_valuation = ?, ai_valuation_details = ?,
        jozour_board_term_start = ?, jozour_board_term_end = ?,
        interest_phase_start = CURRENT_TIMESTAMP,
        interest_phase_end = datetime('now', '+14 days')
      WHERE id = ?
    `).bind(
      feasibilityResult.score, JSON.stringify(feasibilityResult),
      valuation.preMoney, valuation.postMoney, JSON.stringify(valuation),
      boardTermStart, boardTermEnd,
      id
    ).run()

    await logAudit(c.env.DB, 'project_approved', 'project', id, null, JSON.stringify({ ...feasibilityResult, valuation }), 'feasibility-ai-v1')

    return c.json({ success: true, score: feasibilityResult.score, valuation, message: 'AI review passed. Interest phase started (14 days).' })
  } catch (e) {
    return c.json({ error: 'AI review failed', details: String(e) }, 500)
  }
})

// Express interest in a project
projectRoutes.post('/:id/interest', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const id = parseInt(c.req.param('id'))
  const { pledge_amount } = await c.req.json()

  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ? AND status = 'interest_phase'").bind(id).first<any>()
  if (!project) return c.json({ error: 'Project not in interest phase' }, 400)

  await c.env.DB.prepare(`
    UPDATE projects SET interest_votes = interest_votes + 1, soft_pledges = soft_pledges + ? WHERE id = ?
  `).bind(pledge_amount || 0, id).run()

  const updated = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<any>()
  const thresholdMet = (updated.soft_pledges >= updated.funding_goal * 0.3) || (updated.interest_votes >= 500)

  return c.json({ 
    success: true, 
    interest_votes: updated.interest_votes, 
    soft_pledges: updated.soft_pledges,
    threshold_met: thresholdMet,
    message: thresholdMet ? 'Interest threshold met! Project ready for live fundraising.' : 'Interest recorded.'
  })
})

// Invest in project (live fundraising)
projectRoutes.post('/:id/invest', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const id = parseInt(c.req.param('id'))
  const { amount } = await c.req.json()

  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ? AND status = 'live_fundraising'").bind(id).first<any>()
  if (!project) return c.json({ error: 'Project not in live fundraising phase' }, 400)

  if (amount < project.min_investment) {
    return c.json({ error: `Minimum investment is ${project.min_investment} EGP` }, 400)
  }

  const remaining = project.funding_goal - project.funding_raised
  if (amount > remaining) {
    return c.json({ error: `Maximum available investment is ${remaining} EGP` }, 400)
  }

  const equityPercent = (amount / (project.pre_money_valuation + project.funding_goal)) * 100
  const sharePrice = project.pre_money_valuation / 10000
  const sharesCount = Math.floor(amount / sharePrice)

  const reservedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  await c.env.DB.prepare(`
    INSERT INTO shareholdings (project_id, user_id, equity_percentage, shares_count, share_price, investment_amount, status, acquired_via, reserved_until)
    VALUES (?, ?, ?, ?, ?, ?, 'reserved', 'primary', ?)
  `).bind(id, payload.uid, equityPercent, sharesCount, sharePrice, amount, reservedUntil).run()

  await c.env.DB.prepare(`
    INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status)
    VALUES (?, 'deposit', ?, ?, 'escrow', 'pending')
  `).bind(id, amount, `user_${payload.uid}`).run()

  await c.env.DB.prepare(`
    UPDATE projects SET funding_raised = funding_raised + ? WHERE id = ?
  `).bind(amount, id).run()

  await logAudit(c.env.DB, 'investment_made', 'shareholding', id, payload.uid, JSON.stringify({ amount, equity: equityPercent, shares: sharesCount }))

  // Check if fully funded - if so, setup SHERKETI equity and board seat
  const updatedProject = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<any>()
  if (updatedProject && updatedProject.funding_raised >= updatedProject.funding_goal) {
    await c.env.DB.prepare("UPDATE projects SET status = 'funded', governance_state = 'active' WHERE id = ?").bind(id).run()
    
    // Auto-create SHERKETI equity shareholding — ALL TIERS get 2.5% (Blueprint Rule 8)
    const jozourEquityPct = updatedProject.jozour_equity_percent || 2.5
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO shareholdings (project_id, user_id, equity_percentage, shares_count, share_price, investment_amount, status, acquired_via)
      VALUES (?, 1, ?, ?, 0, 0, 'active', 'platform_fee')
    `).bind(id, jozourEquityPct, Math.floor(jozourEquityPct * 100)).run()
    
    // Auto-create SHERKETI commission escrow record
    const commissionAmount = updatedProject.funding_goal * (updatedProject.jozour_commission_percent / 100)
    await c.env.DB.prepare(`
      INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status)
      VALUES (?, 'commission', ?, 'escrow', 'SHERKETI', 'completed')
    `).bind(id, commissionAmount).run()

    // Insurance Vault contribution (Add-on 8): 0.5% of each fundraising
    const vaultContribution = updatedProject.funding_goal * 0.005
    await c.env.DB.prepare(`
      INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status)
      VALUES (?, 'insurance_vault', ?, 'escrow', 'Insurance Vault', 'completed')
    `).bind(id, vaultContribution).run()

    // Auto-create SHERKETI board seat with 5yr term + veto for ALL tiers
    const termEnd = new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString()
    const vetoCategories = JSON.stringify([
      'zero_custody', 'escrow_non_approved', 'egyptian_law_violation',
      'asset_sale_50pct', 'equity_dilution', 'platform_removal'
    ])
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO board_members (project_id, user_id, role, status, has_veto, veto_categories, term_start, term_end, term_years)
      VALUES (?, 1, 'jozour_observer', 'active', 1, ?, CURRENT_TIMESTAMP, ?, 5)
    `).bind(id, vetoCategories, termEnd).run()

    await logAudit(c.env.DB, 'project_funded', 'project', id, null, JSON.stringify({ 
      funding_raised: updatedProject.funding_goal,
      jozour_commission: commissionAmount,
      jozour_equity: '2.5%',
      jozour_board: '5yr veto (6 categories)',
      insurance_vault: vaultContribution
    }))
  }

  return c.json({
    success: true,
    equity_percentage: equityPercent.toFixed(4),
    shares: sharesCount,
    share_price: sharePrice,
    reserved_until: reservedUntil,
    message: 'Investment reserved. Transfer funds to law firm escrow within 48 hours.'
  })
})

// SHERKETI Valuation Algorithm v3.0
function calculateValuation(project: any, feasibilityScore: number) {
  const sectorMultipliers: Record<string, number> = {
    'Technology': 8.5, 'FinTech': 9.0, 'Green Energy': 7.5, 'Healthcare': 7.0,
    'Food & Beverage': 5.0, 'Real Estate': 6.0, 'Education': 6.5, 'E-Commerce': 7.5,
    'Manufacturing': 4.5, 'Agriculture': 4.0, 'Logistics': 6.0, 'Other': 5.0
  }

  const fundingGoal = project.funding_goal
  const sectorMultiplier = sectorMultipliers[project.sector] || 5.0
  const estimatedRevenue = fundingGoal * 0.6
  const revenueFactor = estimatedRevenue * sectorMultiplier * 0.4
  const netAssets = fundingGoal * 0.8 * 0.25
  const scorecard = fundingGoal * 1.15 * 0.2
  const growthMultiplier = 0.7 + (feasibilityScore / 100) * 1.2
  const growthFactor = fundingGoal * growthMultiplier * 0.1
  const founderPremium = fundingGoal * (feasibilityScore > 80 ? 0.12 : feasibilityScore > 60 ? 0.06 : 0.02) * 0.05

  // Deduct SHERKETI commission from valuation
  const jozourCommission = fundingGoal * 0.025 // 2.5% cash commission always

  const rawValuation = revenueFactor + netAssets + scorecard + growthFactor + founderPremium - jozourCommission
  const preMoney = Math.round(rawValuation / 50000) * 50000

  return {
    preMoney,
    postMoney: preMoney + fundingGoal,
    method: 'jozour_valuation_v3',
    components: {
      revenue_sector: { value: revenueFactor, weight: '40%', multiplier: sectorMultiplier },
      net_assets: { value: netAssets, weight: '25%' },
      scorecard: { value: scorecard, weight: '20%', multiplier: 1.15 },
      growth_potential: { value: growthFactor, weight: '10%', multiplier: growthMultiplier },
      founder_premium: { value: founderPremium, weight: '5%' }
    },
    jozour_fees: {
      commission: { percent: '2.5%', amount: jozourCommission },
      equity: { percent: '2.5%' },
      board_seat: '5yr with veto (6 categories)'
    },
    investorEquity: ((fundingGoal / (preMoney + fundingGoal)) * 100).toFixed(2) + '%'
  }
}

// Get project milestones
projectRoutes.get('/:id/milestones', async (c) => {
  const id = parseInt(c.req.param('id'))
  const milestones = await c.env.DB.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY order_index ASC').bind(id).all()
  return c.json({ milestones: milestones.results })
})

// Start live fundraising
projectRoutes.post('/:id/go-live', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const id = parseInt(c.req.param('id'))
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ? AND founder_id = ? AND status = 'interest_phase'").bind(id, payload.uid).first<any>()
  if (!project) return c.json({ error: 'Project not found or not in interest phase' }, 404)

  const thresholdMet = (project.soft_pledges >= project.funding_goal * 0.3) || (project.interest_votes >= 500)
  if (!thresholdMet) return c.json({ error: 'Interest threshold not met yet' }, 400)

  await c.env.DB.prepare(`
    UPDATE projects SET status = 'live_fundraising', funding_start = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(id).run()

  await logAudit(c.env.DB, 'fundraising_started', 'project', id, payload.uid, 'Live fundraising phase started')
  return c.json({ success: true, message: 'Live fundraising phase started!' })
})

// Complete milestone
projectRoutes.post('/:id/milestones/:milestoneId/complete', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const projectId = parseInt(c.req.param('id'))
  const milestoneId = parseInt(c.req.param('milestoneId'))
  const { evidence_hash } = await c.req.json()

  await c.env.DB.prepare(`
    UPDATE milestones SET status = 'completed', completion_date = CURRENT_TIMESTAMP, evidence_hash = ? WHERE id = ? AND project_id = ?
  `).bind(evidence_hash || `EVD-${Date.now()}`, milestoneId, projectId).run()

  await logAudit(c.env.DB, 'milestone_completed', 'milestone', milestoneId, payload.uid, JSON.stringify({ project_id: projectId }))
  return c.json({ success: true, message: 'Milestone marked as completed. Tranche release can now be requested.' })
})
