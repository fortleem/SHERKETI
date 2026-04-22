// EXIT PATHWAYS & IPO PREP - Part XIV Blueprint v3.1
// M&A, MBO, IPO, Secondary Liquidity, Dividend Perpetual
import { Hono } from 'hono'
import { verifyToken, logAudit } from '../utils/auth'

export const exitRoutes = new Hono()

// POST /exit-readiness - AI Exit Readiness Scoring (0-100)
exitRoutes.post('/exit-readiness', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { project_id, exit_type } = await c.req.json()
  if (!project_id || !exit_type) return c.json({ error: 'project_id and exit_type required' }, 400)
  
  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first()
  if (!project) return c.json({ error: 'Project not found' }, 404)
  
  const milestones = await env.DB.prepare('SELECT * FROM milestones WHERE project_id = ?').bind(project_id).all()
  const shareholders = await env.DB.prepare('SELECT COUNT(*) as count FROM shareholdings WHERE project_id = ? AND status = ?').bind(project_id, 'active').first()
  const boardMembers = await env.DB.prepare('SELECT * FROM board_members WHERE project_id = ? AND status = ?').bind(project_id, 'active').all()
  const disputes = await env.DB.prepare('SELECT COUNT(*) as count FROM disputes WHERE project_id = ? AND status NOT IN (?,?)').bind(project_id, 'resolved', 'dismissed').first()
  const escrow = await env.DB.prepare('SELECT SUM(amount) as total FROM escrow_transactions WHERE project_id = ? AND status = ?').bind(project_id, 'completed').first()
  
  // Operational Maturity (40%) - Part XIV.3
  const completedMilestones = milestones.results?.filter((m: any) => m.status === 'completed').length || 0
  const totalMilestones = milestones.results?.length || 1
  const milestoneRate = completedMilestones / totalMilestones
  const teamSize = (shareholders as any)?.count || 0
  const boardSize = boardMembers.results?.length || 0
  const operationalMaturity = Math.min(100, (milestoneRate * 40) + (teamSize > 5 ? 20 : teamSize * 4) + (boardSize >= 3 ? 25 : boardSize * 8) + ((project as any).health_score > 70 ? 15 : (project as any).health_score * 0.15))
  
  // Financial Predictability (30%) - Revenue consistency, margin stability
  const revenue = (project as any).annual_revenue || 0
  const profit = (project as any).net_profit || 0
  const fundingGoal = (project as any).funding_goal || 1
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0
  const revenueToGoal = revenue / fundingGoal
  const financialPredictability = Math.min(100, (profitMargin > 20 ? 40 : profitMargin * 2) + (revenueToGoal > 1 ? 30 : revenueToGoal * 30) + (profit > 0 ? 30 : 0))
  
  // Governance Stability (20%) - Board effectiveness, decision quality
  const activeDisputes = (disputes as any)?.count || 0
  const governanceStability = Math.min(100, (boardSize >= 3 ? 40 : boardSize * 13) + (activeDisputes === 0 ? 30 : Math.max(0, 30 - activeDisputes * 10)) + ((project as any).health_score > 70 ? 30 : (project as any).health_score * 0.3))
  
  // Market Position (10%) - Competitive advantage
  const feasibilityScore = (project as any).ai_feasibility_score || 50
  const marketPosition = Math.min(100, feasibilityScore * 0.6 + (revenue > fundingGoal ? 40 : (revenue / fundingGoal) * 40))
  
  // Weighted overall
  const readinessScore = Math.round(
    operationalMaturity * 0.40 +
    financialPredictability * 0.30 +
    governanceStability * 0.20 +
    marketPosition * 0.10
  )
  
  const readinessLevel = readinessScore >= 85 ? 'optimal' : readinessScore >= 70 ? 'ready' : readinessScore >= 50 ? 'developing' : 'early'
  
  // Exit-type specific recommendations
  const recommendations: Record<string, string[]> = {
    ma: [
      'Prepare financial data room with 3 years of audited statements',
      'Document all IP and proprietary assets',
      'Ensure clean cap table with no disputed shares',
      'Engage M&A advisory firm through platform matchmaking',
      'Optimize valuation metrics before buyer approach'
    ],
    mbo: [
      'Assess management team financial capacity',
      'Structure financing with escrow-backed installments',
      'Plan equity transition over 12-24 months',
      'Define performance-based earnout milestones',
      'Ensure board approval and law firm notarization'
    ],
    ipo: [
      'Ensure IFRS-compliant financial reporting for 3 years',
      'Achieve governance standards exceeding EGX minimum',
      'Prepare prospectus with law firm review',
      'Match with EGX-registered underwriter',
      'Complete FRA regulatory pre-clearance',
      'Plan roadshow (virtual + physical in Cairo/Alexandria)'
    ],
    secondary_liquidity: [
      'Enable gradual ownership transition via secondary market',
      'Set diversification targets for founder wealth',
      'Structure tax-efficient share disposal plan',
      'Maintain fundamental price stability through transparency',
      'Use 72-hour priority window for controlled transitions'
    ],
    dividend_perpetual: [
      'Establish stable income generation model',
      'Document intergenerational transfer plan',
      'Set up automatic dividend distribution system',
      'Maintain low-risk investment profile',
      'Ensure sustainable profit margins > 15%'
    ]
  }
  
  // Store assessment
  await env.DB.prepare(`
    INSERT INTO exit_assessments (project_id, exit_type, readiness_score, operational_maturity, financial_predictability, governance_stability, market_position, readiness_level, recommendations, ai_analysis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(project_id, exit_type, readinessScore, operationalMaturity, financialPredictability, governanceStability, marketPosition, readinessLevel, JSON.stringify(recommendations[exit_type] || []),
    JSON.stringify({ revenue, profit, profitMargin, milestoneRate, boardSize, activeDisputes, healthScore: (project as any).health_score })
  ).run()
  
  await logAudit(env.DB, 'exit_readiness_assessment', 'project', project_id, auth.uid, JSON.stringify({ exit_type, readinessScore, readinessLevel }))
  
  return c.json({
    project_id,
    exit_type,
    readiness_score: readinessScore,
    readiness_level: readinessLevel,
    components: {
      operational_maturity: { score: Math.round(operationalMaturity), weight: '40%' },
      financial_predictability: { score: Math.round(financialPredictability), weight: '30%' },
      governance_stability: { score: Math.round(governanceStability), weight: '20%' },
      market_position: { score: Math.round(marketPosition), weight: '10%' }
    },
    recommendations: recommendations[exit_type] || [],
    action_required: readinessLevel === 'early' ? 'Focus on fundamentals before pursuing exit' :
                     readinessLevel === 'developing' ? 'Prepare for opportunities - address weak areas' :
                     readinessLevel === 'ready' ? 'Actively seek exit opportunities' :
                     'Prime exit window - proceed with chosen strategy',
    blueprint_reference: 'Part XIV.3 - AI Exit Readiness Scoring'
  })
})

// GET /assessments/:projectId - Get exit assessments history
exitRoutes.get('/assessments/:projectId', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const projectId = c.req.param('projectId')
  const assessments = await c.env.DB.prepare('SELECT * FROM exit_assessments WHERE project_id = ? ORDER BY created_at DESC').bind(projectId).all()
  return c.json({ assessments: assessments.results })
})

// POST /ipo-prep - IPO Preparation Suite (Part XIV.2)
exitRoutes.post('/ipo-prep', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)
  
  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first()
  if (!project) return c.json({ error: 'Project not found' }, 404)
  
  const p = project as any
  
  // EGX Listing Readiness Assessment
  const egxChecklist = {
    financial_reporting: {
      status: p.quarterly_reports ? 'complete' : 'incomplete',
      requirement: 'IFRS-compliant financial reporting for minimum 3 years',
      notes: 'Automated reports generated via SHERKETI financial system'
    },
    governance_standards: {
      status: p.health_score >= 70 ? 'meets_requirements' : 'needs_improvement',
      requirement: 'Corporate governance exceeding EGX minimum requirements',
      score: p.health_score
    },
    regulatory_compliance: {
      status: 'pending_fra_review',
      requirement: 'FRA pre-clearance and GAFI registration complete',
      notes: 'SHERKETI facilitates FRA read-only dashboard access'
    },
    minimum_valuation: {
      status: (p.pre_money_valuation || 0) >= 50000000 ? 'eligible' : 'below_threshold',
      requirement: 'Minimum 50M EGP valuation for EGX SME exchange',
      current_valuation: p.pre_money_valuation
    },
    shareholder_distribution: {
      requirement: 'Minimum public float requirements met',
      notes: 'SHERKETI cap table provides ready-made distribution'
    }
  }
  
  // Underwriter matching
  const underwriterMatching = {
    recommended: [
      { name: 'EFG Hermes', specialty: 'Large-cap IPOs', match_score: 85 },
      { name: 'CI Capital', specialty: 'SME listings', match_score: 92 },
      { name: 'Pharos Holding', specialty: 'Tech sector IPOs', match_score: 78 }
    ],
    notes: 'Platform-recommended based on sector and size fit'
  }
  
  // Roadshow plan
  const roadshowPlan = {
    virtual: {
      duration: '2 weeks',
      format: 'SHERKETI-hosted webinars for existing investor base',
      sessions: ['Institutional investors - Cairo', 'Retail investors - Nationwide', 'GCC investors - Virtual']
    },
    physical: {
      locations: ['Cairo Financial Center', 'Alexandria Business Club', 'SHERKETI Annual Summit'],
      estimated_cost: 'Platform-subsidized for graduating companies'
    }
  }
  
  // Post-IPO
  const postIpo = {
    continuous_disclosure: 'SHERKETI financial reporting system auto-generates EGX-compliant filings',
    governance_transition: 'Board structure already exceeds EGX requirements',
    shareholder_migration: 'Seamless cap table transfer from SHERKETI to EGX registry'
  }
  
  const fundamentalPrice = p.fundamental_share_price || 0
  
  await logAudit(env.DB, 'ipo_preparation_requested', 'project', project_id, auth.uid, JSON.stringify({ valuation: p.pre_money_valuation }))
  
  return c.json({
    project_id,
    project_name: p.title,
    current_valuation: p.pre_money_valuation,
    fundamental_share_price: fundamentalPrice,
    egx_readiness: egxChecklist,
    underwriter_matching: underwriterMatching,
    roadshow_plan: roadshowPlan,
    post_ipo: postIpo,
    estimated_timeline: '6-12 months from readiness to listing',
    blueprint_reference: 'Part XIV.2 - IPO Preparation Suite'
  })
})

// POST /ma-readiness - M&A Readiness Package (Part XIV.1)
exitRoutes.post('/ma-readiness', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)
  
  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first()
  if (!project) return c.json({ error: 'Project not found' }, 404)
  
  const p = project as any
  const shareholders = await env.DB.prepare('SELECT COUNT(*) as count FROM shareholdings WHERE project_id = ? AND status = ?').bind(project_id, 'active').first()
  const contracts = await env.DB.prepare('SELECT COUNT(*) as count FROM contracts WHERE project_id = ? AND status = ?').bind(project_id, 'active').first()
  const employees = await env.DB.prepare('SELECT COUNT(*) as count FROM employee_registry WHERE project_id = ? AND status = ?').bind(project_id, 'active').first()
  
  return c.json({
    project_id,
    project_name: p.title,
    data_room_status: {
      financial_statements: p.quarterly_reports ? 'available' : 'needs_preparation',
      cap_table: 'auto-generated from SHERKETI ledger',
      shareholder_count: (shareholders as any)?.count || 0,
      active_contracts: (contracts as any)?.count || 0,
      employee_count: (employees as any)?.count || 0,
      ip_documentation: 'requires_manual_compilation',
      legal_history: 'available from audit log',
      governance_records: 'complete from immutable ledger'
    },
    valuation_optimization: {
      current_valuation: p.pre_money_valuation,
      fundamental_price: p.fundamental_share_price,
      optimization_suggestions: [
        'Accelerate milestone completion to improve operational metrics',
        'Increase quarterly revenue reporting frequency for better visibility',
        'Resolve any pending disputes to clean governance record',
        'Build strategic partnerships to increase market position score'
      ]
    },
    buyer_matching: {
      algorithm: 'AI analyzes sector, size, geography, and strategic fit',
      notes: 'Cross-reference with SHERKETI project database and GAFI Investment Map'
    },
    due_diligence_readiness: {
      legal: p.law_firm_id ? 'law_firm_assigned' : 'needs_assignment',
      financial: p.annual_revenue ? 'data_available' : 'needs_compilation',
      operational: p.health_score >= 50 ? 'healthy' : 'needs_improvement'
    },
    blueprint_reference: 'Part XIV.1 - M&A Readiness Package'
  })
})

// POST /mbo-plan - Management Buy-Out (Part XIV.1)
exitRoutes.post('/mbo-plan', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { project_id, buyer_id, proposed_price_per_share, installment_months } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)
  
  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first()
  if (!project) return c.json({ error: 'Project not found' }, 404)
  
  const p = project as any
  const fundamentalPrice = p.fundamental_share_price || 0
  const priceDeviation = fundamentalPrice > 0 ? Math.abs(((proposed_price_per_share || fundamentalPrice) - fundamentalPrice) / fundamentalPrice * 100) : 0
  
  return c.json({
    project_id,
    mbo_plan: {
      proposed_buyer: buyer_id || 'management_team',
      proposed_price_per_share: proposed_price_per_share || fundamentalPrice,
      ai_fundamental_price: fundamentalPrice,
      price_deviation: `${priceDeviation.toFixed(1)}%`,
      price_acceptable: priceDeviation <= 10,
      installment_months: installment_months || 24,
      financing: {
        method: 'escrow-backed installments via law firm',
        payment_schedule: `${installment_months || 24} monthly payments`,
        escrow_protection: '100% of unpaid balance held in law firm escrow'
      },
      equity_transition: {
        phase_1: 'Initial 30% transfer upon signing',
        phase_2: 'Remaining 70% transferred per installment completion',
        performance_earnouts: 'Additional 10% bonus if revenue grows >20% during transition'
      },
      succession_plan: {
        current_board: 'Continues until full transition',
        sherketi_seat: 'Maintained per 5-year term agreement',
        governance: 'All constitutional rules remain in effect during transition'
      },
      requires: ['Board approval vote', 'Law firm notarization', 'Shareholder >50% approval', 'GAFI registration update']
    },
    blueprint_reference: 'Part XIV.1 - Management Buy-Out'
  })
})
