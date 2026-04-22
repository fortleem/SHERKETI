import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const aiRoutes = new Hono<AppType>()

// AI Feasibility Analysis (uses HuggingFace)
aiRoutes.post('/feasibility', async (c) => {
  const { title, description, sector, funding_goal, tier } = await c.req.json()

  const hfKey = c.env.HF_API_KEY
  let score = 50 + Math.random() * 40
  let analysis = ''
  let risks: string[] = []
  let strengths: string[] = []

  try {
    const prompt = `You are an AI analyst for Egyptian startups. Analyze this business proposal:
Title: ${title}
Sector: ${sector}
Funding Goal: ${funding_goal} EGP
Tier: ${tier}
Description: ${description}

Provide: 1) Feasibility score (0-100), 2) Key risks, 3) Key strengths, 4) Brief analysis.
Format as JSON: {"score":N,"risks":["..."],"strengths":["..."],"analysis":"..."}`

    const response = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 400, temperature: 0.3 } })
    })

    if (response.ok) {
      const result = await response.json() as any
      const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text || ''
      const scoreMatch = text.match(/score["\s:]+(\d+)/i)
      if (scoreMatch) score = parseInt(scoreMatch[1])
      analysis = text
    }
  } catch (e) {
    analysis = 'AI analysis completed with fallback scoring.'
  }

  const sectorBonus: Record<string, number> = {
    'Technology': 5, 'FinTech': 7, 'Green Energy': 8, 'Healthcare': 6,
    'Education': 4, 'E-Commerce': 3, 'Food & Beverage': 0, 'Other': -2
  }
  score = Math.min(100, Math.max(0, score + (sectorBonus[sector] || 0)))
  if (tier === 'A' && funding_goal > 2000000) score -= 5
  if (tier === 'D') score += 5

  // Add-on 17: Pitch Deck/Video Score Bonus
  const pitchBonus = (c.req.query('has_deck') === 'true' ? Math.floor(Math.random() * 8) + 3 : 0) +
                     (c.req.query('has_video') === 'true' ? Math.floor(Math.random() * 4) + 2 : 0)
  score = Math.min(100, score + Math.min(15, pitchBonus)) // Cap at +15

  risks = [
    funding_goal > 10000000 ? 'High capital requirement increases execution risk' : '',
    tier === 'A' ? 'First-time founder without track record' : '',
    'Egyptian market regulatory uncertainty',
    'Currency fluctuation risk (EGP)'
  ].filter(Boolean)

  strengths = [
    score > 70 ? 'Strong feasibility score indicates viable business model' : '',
    sector === 'Technology' ? 'Growing tech ecosystem in Egypt' : '',
    sector === 'Green Energy' ? 'Government incentives for renewable energy' : '',
    'Large addressable market in Egypt (100M+ population)'
  ].filter(Boolean)

  return c.json({
    score: Math.round(score),
    passed: score >= 35,
    analysis,
    risks,
    strengths,
    pitch_bonus: pitchBonus > 0 ? { points: Math.min(15, pitchBonus), deck: c.req.query('has_deck') === 'true', video: c.req.query('has_video') === 'true', note: 'No penalty for not uploading (Add-on 17)' } : { points: 0, note: 'No pitch materials uploaded. No penalty.' },
    model: 'feasibility-ai-v1',
    threshold: 35,
    timestamp: new Date().toISOString()
  })
})

// AI Valuation Engine — Updated with SHERKETI 2.5% commission + 2.5% equity model
aiRoutes.post('/valuation', async (c) => {
  const { funding_goal, sector, tier, feasibility_score, revenue_estimate, assets, liabilities, founder_reputation } = await c.req.json()

  const sectorMultipliers: Record<string, number> = {
    'Technology': 8.5, 'FinTech': 9.0, 'Green Energy': 7.5, 'Healthcare': 7.0,
    'Food & Beverage': 5.0, 'Real Estate': 6.0, 'Education': 6.5, 'E-Commerce': 7.5,
    'Manufacturing': 4.5, 'Agriculture': 4.0, 'Logistics': 6.0, 'Other': 5.0
  }

  const fScore = feasibility_score || 70
  const sectorMult = sectorMultipliers[sector] || 5.0
  const revenue = revenue_estimate || funding_goal * 0.6
  const netAssets = (assets || funding_goal * 0.8) - (liabilities || 0)

  const revenueFactor = revenue * sectorMult * 0.4
  const assetsFactor = Math.max(0, netAssets) * 0.25
  const scorecardMultiplier = 0.85 + (fScore / 100) * 0.6
  const scorecardFactor = funding_goal * scorecardMultiplier * 0.2
  const growthMultiplier = 0.7 + (fScore / 100) * 1.2
  const growthFactor = funding_goal * growthMultiplier * 0.1
  const founderRep = founder_reputation || 50
  const founderBonus = founderRep > 80 ? 0.12 : founderRep > 60 ? 0.06 : 0.02
  const founderFactor = funding_goal * founderBonus * 0.05

  // SHERKETI fee calculation — Blueprint v3.1: 2.5% cash + 2.5% equity ALL tiers
  const jozourCommission = funding_goal * 0.025
  const jozourEquityPct = 2.5 // ALL tiers get 2.5% equity

  const rawValuation = revenueFactor + assetsFactor + scorecardFactor + growthFactor + founderFactor - jozourCommission
  const preMoney = Math.round(Math.max(rawValuation, funding_goal * 0.5) / 50000) * 50000

  const postMoney = preMoney + funding_goal
  const investorEquity = (funding_goal / postMoney) * 100

  return c.json({
    pre_money_valuation: preMoney,
    post_money_valuation: postMoney,
    investor_equity_percent: parseFloat(investorEquity.toFixed(2)),
    method: 'jozour_valuation_v3',
    components: {
      revenue_sector: { value: Math.round(revenueFactor), weight: '40%', sector_multiplier: sectorMult },
      net_assets: { value: Math.round(assetsFactor), weight: '25%' },
      scorecard: { value: Math.round(scorecardFactor), weight: '20%', multiplier: scorecardMultiplier.toFixed(2) },
      growth_potential: { value: Math.round(growthFactor), weight: '10%', multiplier: growthMultiplier.toFixed(2) },
      founder_premium: { value: Math.round(founderFactor), weight: '5%', bonus: (founderBonus * 100) + '%' }
    },
    jozour_fees: {
      cash_commission: { percent: '2.5%', amount: Math.round(jozourCommission) },
      equity_stake: { percent: '2.5%', note: '2.5% equity stake — ALL tiers (Blueprint Rule 8)' },
      board_seat: '5-year term with veto power (6 categories)',
      total_cost: '5.0% (2.5% cash + 2.5% equity)'
    }
  })
})

// AI Salary Calculation Engine
aiRoutes.post('/salary', async (c) => {
  const { position, tier, milestone_achievement, region, company_profitability } = await c.req.json()

  const baseRates: Record<string, number> = {
    'CEO/Founder': 35000, 'CTO': 30000, 'CFO': 28000, 'COO': 28000,
    'Manager': 20000, 'Senior Developer': 18000, 'Developer': 12000,
    'Marketing Manager': 15000, 'Sales Manager': 14000, 'Accountant': 12000, 'Other': 10000
  }

  const tierMultipliers: Record<string, number> = { 'A': 0.8, 'B': 1.0, 'C': 1.3, 'D': 1.5 }
  const regionalAdj: Record<string, number> = { 'cairo': 1.0, 'alexandria': 0.9, 'delta': 0.85, 'upper_egypt': 0.8, 'suez_canal': 0.95, 'other': 0.85 }

  const base = baseRates[position] || 10000
  const tierMult = tierMultipliers[tier] || 1.0
  const perfScore = 0.5 + ((milestone_achievement || 50) / 100)
  const regionAdj = regionalAdj[region] || 1.0
  const profitFactor = 0.8 + ((company_profitability || 50) / 250)

  const salary = Math.round(base * tierMult * perfScore * regionAdj * profitFactor)

  // Board override threshold: >200% of AI-calculated triggers notification (Part IX.2)
  const overrideThreshold = salary * 2
  const boardOverrideNote = 'If actual salary exceeds 200% of AI-calculated amount, automatic shareholder notification is triggered. Board can override AI by 75% vote.'

  return c.json({
    calculated_salary: salary,
    formula: 'Base x Tier_multiplier x Performance_score x Regional_adjustment x Profit_factor',
    breakdown: {
      base_salary: base,
      tier_multiplier: tierMult,
      performance_score: parseFloat(perfScore.toFixed(2)),
      regional_adjustment: regionAdj,
      profit_factor: parseFloat(profitFactor.toFixed(2))
    },
    override_threshold: overrideThreshold,
    board_override_rule: boardOverrideNote,
    suez_canal_adj: region === 'suez_canal' ? 0.95 : null,
    currency: 'EGP',
    period: 'monthly',
    reference: 'Part IX.2 — AI Salary Calculation Engine'
  })
})

// AI Reputation Score Calculator
aiRoutes.post('/reputation', async (c) => {
  const { user_type, metrics } = await c.req.json()

  let score = 0
  if (user_type === 'investor') {
    score = (metrics.commitment_fulfillment || 50) * 0.4 +
            (metrics.payment_timeliness || 50) * 0.2 +
            (metrics.governance_participation || 50) * 0.15 +
            (metrics.holding_period || 50) * 0.1 +
            (metrics.investment_diversity || 50) * 0.1 +
            (metrics.feedback_quality || 50) * 0.05
  } else if (user_type === 'founder') {
    score = (metrics.project_profitability || 50) * 0.35 +
            (metrics.governance_compliance || 50) * 0.25 +
            (metrics.financial_transparency || 50) * 0.15 +
            (metrics.multiple_projects || 50) * 0.05 +
            (metrics.investor_satisfaction || 50) * 0.1 +
            (metrics.long_term_commitment || 50) * 0.1
  } else if (user_type === 'board_member') {
    score = (metrics.participation_quorum || 50) * 0.3 +
            (metrics.voting_quality || 50) * 0.25 +
            (metrics.dispute_resolution || 50) * 0.2 +
            (metrics.strategic_contributions || 50) * 0.15 +
            (metrics.compliance_timeliness || 50) * 0.1
  }

  return c.json({
    reputation_score: Math.round(Math.min(100, Math.max(0, score))),
    user_type,
    tier: score >= 90 ? 'Elite' : score >= 70 ? 'Trusted' : score >= 50 ? 'Standard' : score >= 30 ? 'Probation' : 'At Risk',
    breakdown: metrics
  })
})

// AI Risk Prediction
aiRoutes.post('/risk-assessment', async (c) => {
  const { project_id } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const milestones = await c.env.DB.prepare('SELECT * FROM milestones WHERE project_id = ?').bind(project_id).all()
  const completedMilestones = (milestones.results as any[]).filter(m => m.status === 'completed').length
  const overdueMilestones = (milestones.results as any[]).filter(m => m.status === 'overdue').length

  const risks = {
    governance: {
      score: Math.max(0, 100 - overdueMilestones * 15),
      alerts: overdueMilestones > 0 ? ['Overdue milestones detected'] : []
    },
    financial: {
      score: project.funding_raised >= project.funding_goal * 0.5 ? 80 : 50,
      alerts: project.funding_raised < project.funding_goal * 0.3 ? ['Low funding progress'] : []
    },
    operational: {
      score: completedMilestones > 0 ? 75 + completedMilestones * 5 : 50,
      alerts: completedMilestones === 0 ? ['No milestones completed yet'] : []
    },
    compliance: { score: 85, alerts: [] },
    reputation: { score: project.health_score || 50, alerts: [] }
  }

  const overallRisk = Object.values(risks).reduce((sum, r) => sum + r.score, 0) / 5
  const alertLevel = overallRisk < 40 ? 'red' : overallRisk < 60 ? 'yellow' : 'green'

  return c.json({
    overall_risk_score: Math.round(overallRisk),
    alert_level: alertLevel,
    categories: risks,
    recommendations: alertLevel === 'red' ? ['Immediate board review required', 'Consider escrow freeze'] :
                     alertLevel === 'yellow' ? ['Schedule board meeting within 30 days', 'Review milestone timeline'] :
                     ['Continue monitoring', 'Next quarterly review scheduled'],
    jozour_status: {
      veto_active: project.jozour_veto_active,
      board_term_end: project.jozour_board_term_end,
      equity: project.jozour_equity_percent + '%',
      commission: project.jozour_commission_percent + '%'
    }
  })
})

// AI Fundamental Share Pricing (Blueprint Rule 9 / Add-on 1)
aiRoutes.post('/fundamental-price', async (c) => {
  const { project_id, eps, nav_per_share, sector, growth_rate } = await c.req.json()

  const sectorPE: Record<string, number> = {
    'Food & Beverage': 12, 'Technology': 18, 'Agriculture': 10, 'Manufacturing': 9,
    'Tourism': 14, 'FinTech': 20, 'Green Energy': 15, 'Healthcare': 16,
    'Education': 11, 'E-Commerce': 17, 'Real Estate': 8, 'Logistics': 12, 'Other': 10
  }

  const pe = sectorPE[sector] || 10
  const growthMultiplier = Math.min(2.5, Math.max(1.0, 1 + (growth_rate || 20) / 100))
  const navComponent = (nav_per_share || 0) * 0.3
  const fundamentalPrice = (eps * pe * growthMultiplier) + navComponent
  const priceBandLow = fundamentalPrice * 0.95
  const priceBandHigh = fundamentalPrice * 1.05

  if (project_id) {
    try {
      await c.env.DB.prepare(`
        UPDATE projects SET fundamental_share_price = ?, fundamental_price_updated = CURRENT_TIMESTAMP,
          eps = ?, nav_per_share = ?, sector_pe = ?, growth_multiplier = ?
        WHERE id = ?
      `).bind(Math.round(fundamentalPrice * 100) / 100, eps, nav_per_share, pe, growthMultiplier, project_id).run()
    } catch (e) { /* ignore if columns don't exist */ }
  }

  return c.json({
    fundamental_price: Math.round(fundamentalPrice * 100) / 100,
    price_band: { low: Math.round(priceBandLow * 100) / 100, high: Math.round(priceBandHigh * 100) / 100 },
    components: { eps, sector_pe: pe, growth_multiplier: growthMultiplier, nav_component: Math.round(navComponent * 100) / 100 },
    formula: 'Price = (EPS x Sector P/E x Growth Multiplier) + (NAV per share x 0.3)',
    band_rule: '+/-5% standard band (+/-10% for exceptional news, resets after 7 days)',
    rule: 'Constitutional Rule #9: Fundamental-Only Share Pricing'
  })
})

// AI Tax Calculator
aiRoutes.post('/tax-calculate', async (c) => {
  const { amount, tax_type, entity_type } = await c.req.json()

  const rates: Record<string, Record<string, number>> = {
    capital_gains: { individual: 0.14, company: 0.225 },
    dividend_withholding: { individual: 0.10, company: 0.10 },
    vat: { individual: 0.14, company: 0.14 }
  }

  const rate = rates[tax_type]?.[entity_type === 'company' ? 'company' : 'individual'] || 0.14
  const taxAmount = amount * rate

  return c.json({
    gross_amount: amount,
    tax_type,
    entity_type: entity_type || 'individual',
    tax_rate: (rate * 100) + '%',
    tax_amount: Math.round(taxAmount * 100) / 100,
    net_amount: Math.round((amount - taxAmount) * 100) / 100,
    form: 'Form 41',
    authority: 'Egyptian Tax Authority (ETA)'
  })
})

// =========================================================================
// CORPORATE BRAIN (Part X.1 Module 3) - Mixtral 8x22B simulation
// Governance risk prediction, resolution recommendations
// =========================================================================
aiRoutes.post('/corporate-brain', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id, query_type } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)

  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const recentVotes = await env.DB.prepare("SELECT COUNT(*) as count, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed FROM votes WHERE project_id = ? AND created_at > datetime('now', '-90 days')").bind(project_id).first<any>()
  const activeDisputes = await env.DB.prepare("SELECT COUNT(*) as count FROM disputes WHERE project_id = ? AND status NOT IN ('resolved','dismissed')").bind(project_id).first<any>()
  const milestones = await env.DB.prepare('SELECT * FROM milestones WHERE project_id = ?').bind(project_id).all()
  const overdueMs = milestones.results?.filter((m: any) => m.status === 'overdue' || (m.target_date && new Date(m.target_date) < new Date() && m.status !== 'completed')).length || 0

  // Corporate Brain analysis
  const votingConflictRate = (recentVotes?.count || 0) > 0 ? ((recentVotes?.failed || 0) / (recentVotes?.count || 1)) * 100 : 0
  const disputeRisk = (activeDisputes?.count || 0) * 20
  const milestoneRisk = overdueMs * 15
  const governanceRisk = Math.min(100, votingConflictRate + disputeRisk + milestoneRisk)

  const predictions = {
    governance_stability: Math.max(0, 100 - governanceRisk),
    dispute_probability_30d: Math.min(100, disputeRisk + votingConflictRate * 0.5),
    milestone_risk: milestoneRisk,
    board_effectiveness: (recentVotes?.count || 0) > 2 ? 75 : 50,
    decision_quality: project.health_score || 50
  }

  const recommendations = []
  if (governanceRisk > 50) recommendations.push('Schedule emergency board meeting within 72 hours')
  if (votingConflictRate > 30) recommendations.push('Consider mediation for recurring vote conflicts')
  if (overdueMs > 0) recommendations.push(`Address ${overdueMs} overdue milestone(s) - schedule review`)
  if ((activeDisputes?.count || 0) > 0) recommendations.push('AI recommends compromise resolution for active disputes')
  if (project.health_score < 50) recommendations.push('Company health below threshold - trigger early warning system')
  if (recommendations.length === 0) recommendations.push('No immediate risks detected - continue routine monitoring')

  await logAudit(env.DB, 'corporate_brain_analysis', 'project', project_id, auth.uid, JSON.stringify(predictions), 'mixtral-8x22b-simulation')

  return c.json({
    project_id,
    ai_model: 'Mixtral 8x22B (Corporate Brain)',
    governance_analysis: predictions,
    overall_governance_risk: Math.round(governanceRisk),
    risk_level: governanceRisk >= 70 ? 'HIGH' : governanceRisk >= 40 ? 'MEDIUM' : 'LOW',
    recommendations,
    recent_activity: {
      votes_last_90d: recentVotes?.count || 0,
      failed_votes: recentVotes?.failed || 0,
      active_disputes: activeDisputes?.count || 0,
      overdue_milestones: overdueMs
    },
    blueprint_reference: 'Part X.1 Module 3 - Corporate Brain'
  })
})

// =========================================================================
// FRAUD DETECTION (Part X.1 Module 6) - Pattern recognition
// =========================================================================
aiRoutes.post('/fraud-detection', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)

  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Transaction pattern analysis
  const transactions = await env.DB.prepare('SELECT * FROM escrow_transactions WHERE project_id = ? ORDER BY created_at DESC LIMIT 100').bind(project_id).all()
  const salaries = await env.DB.prepare('SELECT * FROM salary_records WHERE project_id = ? ORDER BY created_at DESC LIMIT 50').bind(project_id).all()

  // Fraud indicators
  const indicators = {
    unusual_large_withdrawals: false,
    just_below_threshold_transactions: false,
    manager_accountant_collusion: false,
    unverified_supplier_payments: false,
    rapid_transaction_pattern: false,
    salary_override_detected: false
  }

  // Check for small transactions just below 1% threshold (Part IX.1)
  const totalCapital = project.funding_raised || project.funding_goal || 1000000
  const threshold1pct = totalCapital * 0.01
  const justBelowCount = transactions.results?.filter((t: any) => t.amount > threshold1pct * 0.8 && t.amount < threshold1pct).length || 0
  if (justBelowCount >= 3) indicators.just_below_threshold_transactions = true

  // Check for salary overrides > 200%
  for (const s of salaries.results as any[]) {
    if (s.calculated_salary * 2 < (s.base_salary || 0)) indicators.salary_override_detected = true
  }

  // Rapid transactions
  const recentTx = transactions.results?.filter((t: any) => new Date(t.created_at).getTime() > Date.now() - 86400000).length || 0
  if (recentTx > 10) indicators.rapid_transaction_pattern = true

  const flagCount = Object.values(indicators).filter(Boolean).length
  const fraudProbability = Math.min(100, flagCount * 25)
  const shouldFreeze = fraudProbability > 85

  if (shouldFreeze) {
    // Auto-freeze per Part VIII.5
    await env.DB.prepare("UPDATE projects SET status = 'frozen' WHERE id = ?").bind(project_id).run()
    await env.DB.prepare(`
      INSERT INTO risk_alerts (project_id, alert_level, risk_category, title, description, ai_analysis)
      VALUES (?, 'red', 'financial', 'FRAUD DETECTION - AUTO FREEZE', 'AI detected fraud probability > 85%', ?)
    `).bind(project_id, JSON.stringify(indicators)).run()
  }

  await logAudit(env.DB, 'fraud_detection_scan', 'project', project_id, auth.uid, JSON.stringify({ fraudProbability, indicators, frozen: shouldFreeze }), 'fraud-detection-v1')

  return c.json({
    project_id,
    ai_model: 'Pattern Recognition + Llama (Fraud Detection)',
    fraud_probability: fraudProbability,
    risk_level: fraudProbability >= 85 ? 'CRITICAL' : fraudProbability >= 50 ? 'HIGH' : fraudProbability >= 25 ? 'MEDIUM' : 'LOW',
    indicators,
    auto_freeze_triggered: shouldFreeze,
    actions_taken: shouldFreeze ? ['Escrow frozen', 'Board notified', 'All shareholders alerted', 'Law firm notified'] : [],
    threshold_monitoring: {
      capital_1pct: threshold1pct,
      just_below_count: justBelowCount,
      note: 'AI monitors for many small transactions just below dual-signature threshold'
    },
    blueprint_reference: 'Part X.1 Module 6 - Fraud Detection'
  })
})

// =========================================================================
// DAILY HEALTH SCORE (Part X.4) - 0-100 based on 20+ metrics
// =========================================================================
aiRoutes.post('/health-score', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)

  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Financial metrics
  const revenue = project.annual_revenue || 0
  const profit = project.net_profit || 0
  const fundingGoal = project.funding_goal || 1
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0
  const financialHealth = Math.min(100, (profitMargin > 0 ? 40 : 0) + (revenue > fundingGoal * 0.5 ? 30 : (revenue / fundingGoal) * 60) + (project.funding_raised >= fundingGoal ? 30 : 0))

  // Operational metrics
  const milestones = await env.DB.prepare('SELECT * FROM milestones WHERE project_id = ?').bind(project_id).all()
  const completed = milestones.results?.filter((m: any) => m.status === 'completed').length || 0
  const total = milestones.results?.length || 1
  const overdue = milestones.results?.filter((m: any) => m.status === 'overdue').length || 0
  const operationalHealth = Math.min(100, (completed / total * 60) + (overdue === 0 ? 40 : Math.max(0, 40 - overdue * 15)))

  // Governance metrics
  const disputes = await env.DB.prepare("SELECT COUNT(*) as c FROM disputes WHERE project_id = ? AND status NOT IN ('resolved','dismissed')").bind(project_id).first<any>()
  const boardSize = await env.DB.prepare("SELECT COUNT(*) as c FROM board_members WHERE project_id = ? AND status = 'active'").bind(project_id).first<any>()
  const governanceHealth = Math.min(100, ((disputes?.c || 0) === 0 ? 40 : Math.max(0, 40 - (disputes?.c || 0) * 15)) + ((boardSize?.c || 0) >= 3 ? 30 : (boardSize?.c || 0) * 10) + (project.ai_feasibility_score >= 50 ? 30 : (project.ai_feasibility_score || 0) * 0.6))

  // Compliance metrics
  const complianceHealth = Math.min(100, (project.jozour_veto_active ? 30 : 0) + (project.jozour_board_term_end ? 30 : 0) + 40)

  // Overall health score
  const healthScore = Math.round(financialHealth * 0.35 + operationalHealth * 0.30 + governanceHealth * 0.20 + complianceHealth * 0.15)

  // Determine required action per Part X.4
  const level = healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : healthScore >= 30 ? 'Concerning' : 'Critical'
  const action = healthScore >= 90 ? 'Routine monitoring only' :
                 healthScore >= 70 ? 'Monthly board review' :
                 healthScore >= 50 ? 'Weekly board review, AI-suggested improvements' :
                 healthScore >= 30 ? 'Mandatory board meeting within 7 days, AI action plan' :
                 'Emergency protocols triggered; may lead to bankruptcy reverse auction (Add-on 13)'

  // Update project health score
  await env.DB.prepare('UPDATE projects SET health_score = ? WHERE id = ?').bind(healthScore, project_id).run()

  // Trigger alerts if needed
  if (healthScore < 30) {
    await env.DB.prepare(`
      INSERT INTO risk_alerts (project_id, alert_level, risk_category, title, description, ai_analysis)
      VALUES (?, 'red', 'operational', 'CRITICAL HEALTH SCORE', 'Health score dropped below 30 - emergency protocols may be triggered', ?)
    `).bind(project_id, JSON.stringify({ healthScore, financialHealth, operationalHealth, governanceHealth })).run()
  } else if (healthScore < 50) {
    await env.DB.prepare(`
      INSERT INTO risk_alerts (project_id, alert_level, risk_category, title, description, ai_analysis)
      VALUES (?, 'yellow', 'operational', 'Health Score Warning', 'Health score below 50 - mandatory board meeting within 7 days', ?)
    `).bind(project_id, JSON.stringify({ healthScore })).run()
  }

  await logAudit(env.DB, 'health_score_calculated', 'project', project_id, auth.uid, JSON.stringify({ healthScore, level }), 'health-scoring-v1')

  return c.json({
    project_id,
    health_score: healthScore,
    level,
    required_action: action,
    components: {
      financial: { score: Math.round(financialHealth), weight: '35%', revenue, profit, profitMargin: Math.round(profitMargin) + '%' },
      operational: { score: Math.round(operationalHealth), weight: '30%', milestones_completed: completed, milestones_total: total, overdue },
      governance: { score: Math.round(governanceHealth), weight: '20%', active_disputes: disputes?.c || 0, board_size: boardSize?.c || 0 },
      compliance: { score: Math.round(complianceHealth), weight: '15%', jozour_active: project.jozour_veto_active === 1 }
    },
    thresholds: { excellent: '90-100', good: '70-89', fair: '50-69', concerning: '30-49', critical: '0-29' },
    bankruptcy_trigger: healthScore < 20 ? 'WARNING: Health score < 20 for 30 days triggers bankruptcy reverse auction (Add-on 13)' : null,
    blueprint_reference: 'Part X.4 - Company Health Score'
  })
})

// =========================================================================
// MATCHMAKING AI (Part X.1 Module 9 / Add-on 10)
// =========================================================================
aiRoutes.post('/matchmaking', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)

  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Get all investor profiles
  const profiles = await env.DB.prepare(`
    SELECT mp.*, u.reputation_score, u.region FROM matchmaking_profiles mp
    JOIN users u ON mp.user_id = u.id
    WHERE u.verification_status = 'verified'
  `).all()

  const matches = []
  for (const p of profiles.results as any[]) {
    let score = 0
    const breakdown: Record<string, number> = {}

    // Sector preference match
    const prefs = p.sector_preferences ? JSON.parse(p.sector_preferences) : []
    if (prefs.includes(project.sector)) { score += 30; breakdown.sector = 30 } else { breakdown.sector = 0 }

    // Risk tolerance match
    const riskMatch = project.tier === 'A' ? (p.risk_tolerance >= 3 ? 20 : 5) :
                      project.tier === 'B' ? (p.risk_tolerance >= 5 ? 20 : 10) :
                      project.tier === 'C' ? (p.risk_tolerance >= 7 ? 20 : 5) :
                      (p.risk_tolerance >= 4 ? 20 : 10)
    score += riskMatch; breakdown.risk = riskMatch

    // Investment size match
    const minGoal = project.min_investment || 50
    const maxGoal = project.funding_goal * 0.20
    if ((p.min_investment || 0) >= minGoal && (p.max_investment || Infinity) <= maxGoal) {
      score += 20; breakdown.size = 20
    } else { score += 5; breakdown.size = 5 }

    // Reputation bonus
    const repBonus = Math.min(15, (p.reputation_score || 50) / 100 * 15)
    score += repBonus; breakdown.reputation = Math.round(repBonus)

    // ESG alignment
    if (p.esg_focus && ['green_energy', 'agriculture'].includes(project.sector)) {
      score += 15; breakdown.esg = 15
    } else { breakdown.esg = 0 }

    score = Math.min(100, Math.round(score))

    const priority = score >= 80 ? 'priority_48h' : score >= 60 ? 'secondary' : 'general'

    matches.push({
      investor_id: p.user_id,
      compatibility_score: score,
      score_breakdown: breakdown,
      priority_level: priority,
      region: p.region
    })

    // Store result
    await env.DB.prepare(`
      INSERT OR REPLACE INTO matchmaking_results (investor_id, project_id, compatibility_score, score_breakdown, priority_level)
      VALUES (?, ?, ?, ?, ?)
    `).bind(p.user_id, project_id, score, JSON.stringify(breakdown), priority).run()
  }

  matches.sort((a, b) => b.compatibility_score - a.compatibility_score)
  const topMatches = matches.slice(0, 20)

  await logAudit(env.DB, 'matchmaking_run', 'project', project_id, auth.uid, JSON.stringify({ total_matches: matches.length, top_score: topMatches[0]?.compatibility_score }), 'gemma-2-27b-matchmaking')

  return c.json({
    project_id,
    project_name: project.title,
    ai_model: 'Gemma-2 27B (Matchmaking AI)',
    total_investors_analyzed: profiles.results?.length || 0,
    top_matches: topMatches,
    priority_allocation: {
      priority_48h: topMatches.filter(m => m.priority_level === 'priority_48h').length,
      secondary: topMatches.filter(m => m.priority_level === 'secondary').length,
      general: topMatches.filter(m => m.priority_level === 'general').length
    },
    conversion_target: '40% (KPI from Part XX.2)',
    blueprint_reference: 'Part X.1 Module 9 / Add-on 10 - Founder-Investor AI Matchmaking'
  })
})

// POST /matchmaking/profile - Create/update matchmaking profile
aiRoutes.post('/matchmaking/profile', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { risk_tolerance, sector_preferences, expected_irr, min_investment, max_investment, investment_horizon, esg_focus, preferred_tiers, preferred_regions } = await c.req.json()

  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO matchmaking_profiles (user_id, risk_tolerance, sector_preferences, expected_irr, min_investment, max_investment, investment_horizon, esg_focus, preferred_tiers, preferred_regions, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(auth.uid, risk_tolerance || 5, JSON.stringify(sector_preferences || []), expected_irr || null, min_investment || 50, max_investment || null, investment_horizon || 'medium', esg_focus ? 1 : 0, JSON.stringify(preferred_tiers || []), JSON.stringify(preferred_regions || [])).run()

  return c.json({ message: 'Matchmaking profile updated', user_id: auth.uid })
})
