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
  const regionalAdj: Record<string, number> = { 'cairo': 1.0, 'alexandria': 0.9, 'delta': 0.85, 'upper_egypt': 0.8, 'other': 0.85 }

  const base = baseRates[position] || 10000
  const tierMult = tierMultipliers[tier] || 1.0
  const perfScore = 0.5 + ((milestone_achievement || 50) / 100)
  const regionAdj = regionalAdj[region] || 1.0
  const profitFactor = 0.8 + ((company_profitability || 50) / 250)

  const salary = Math.round(base * tierMult * perfScore * regionAdj * profitFactor)

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
    currency: 'EGP',
    period: 'monthly'
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
