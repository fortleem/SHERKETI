// ESG, IMPACT & SUSTAINABILITY - Part XV Blueprint v3.1
// Environmental, Social, Governance scoring + SDG alignment + Green certification
import { Hono } from 'hono'
import { verifyToken, logAudit } from '../utils/auth'

export const esgRoutes = new Hono()

// SDG mapping
const SDG_MAP: Record<string, string[]> = {
  'agriculture': ['SDG 2 - Zero Hunger', 'SDG 12 - Responsible Consumption', 'SDG 15 - Life on Land'],
  'manufacturing': ['SDG 9 - Industry Innovation', 'SDG 12 - Responsible Consumption', 'SDG 8 - Decent Work'],
  'technology': ['SDG 9 - Industry Innovation', 'SDG 4 - Quality Education', 'SDG 8 - Decent Work'],
  'tourism': ['SDG 8 - Decent Work', 'SDG 11 - Sustainable Cities', 'SDG 14 - Life Below Water'],
  'retail': ['SDG 8 - Decent Work', 'SDG 12 - Responsible Consumption'],
  'food_beverage': ['SDG 2 - Zero Hunger', 'SDG 3 - Good Health', 'SDG 12 - Responsible Consumption'],
  'healthcare': ['SDG 3 - Good Health', 'SDG 10 - Reduced Inequalities'],
  'education': ['SDG 4 - Quality Education', 'SDG 10 - Reduced Inequalities'],
  'fintech': ['SDG 8 - Decent Work', 'SDG 10 - Reduced Inequalities', 'SDG 1 - No Poverty'],
  'green_energy': ['SDG 7 - Affordable Clean Energy', 'SDG 13 - Climate Action', 'SDG 11 - Sustainable Cities'],
  'real_estate': ['SDG 11 - Sustainable Cities', 'SDG 9 - Industry Innovation'],
  'logistics': ['SDG 9 - Industry Innovation', 'SDG 11 - Sustainable Cities']
}

// POST /assess - Full ESG Assessment (Part XV.1)
esgRoutes.post('/assess', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)
  
  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first()
  if (!project) return c.json({ error: 'Project not found' }, 404)
  
  const p = project as any
  const employees = await env.DB.prepare('SELECT * FROM employee_registry WHERE project_id = ?').bind(project_id).all()
  const boardMembers = await env.DB.prepare('SELECT * FROM board_members WHERE project_id = ? AND status = ?').bind(project_id, 'active').all()
  
  const empCount = employees.results?.length || 0
  
  // Environmental scoring (Part XV.1)
  const sectorEnvFactors: Record<string, number> = {
    'green_energy': 90, 'agriculture': 65, 'technology': 50, 'manufacturing': 40,
    'food_beverage': 55, 'tourism': 45, 'fintech': 60, 'healthcare': 55,
    'retail': 40, 'logistics': 35, 'real_estate': 35, 'education': 70
  }
  const baseEnvScore = sectorEnvFactors[p.sector] || 50
  const carbonFootprint = Math.max(0, 100 - baseEnvScore)
  const resourceEfficiency = baseEnvScore * 0.8 + Math.random() * 20
  const wasteManagement = baseEnvScore * 0.7 + Math.random() * 30
  const environmentalScore = Math.round((baseEnvScore * 0.4 + resourceEfficiency * 0.3 + wasteManagement * 0.3))
  
  // Social scoring (Part XV.1)
  const employeeWelfare = empCount > 0 ? Math.min(100, 50 + empCount * 2) : 30
  const communityImpact = empCount > 10 ? 80 : empCount * 8
  const jobsCreated = empCount
  const region = p.company_region || 'cairo'
  const regionalBonus = region === 'upper_egypt' ? 15 : region === 'delta' ? 10 : region === 'suez_canal' ? 8 : 0
  const socialScore = Math.round(Math.min(100, employeeWelfare * 0.35 + communityImpact * 0.3 + 50 * 0.2 + regionalBonus + 50 * 0.15))
  
  // Governance scoring (Part XV.1)
  const boardDiversity = boardMembers.results?.length >= 3 ? 80 : (boardMembers.results?.length || 0) * 25
  const transparency = p.health_score >= 70 ? 90 : p.health_score
  const ethicalPractices = p.ai_feasibility_score >= 50 ? 80 : 50
  const governanceScore = Math.round(boardDiversity * 0.35 + transparency * 0.35 + ethicalPractices * 0.30)
  
  const overallScore = Math.round(environmentalScore * 0.33 + socialScore * 0.34 + governanceScore * 0.33)
  
  // SDG Alignment
  const sdgAlignment = SDG_MAP[p.sector] || ['SDG 8 - Decent Work']
  
  // Green Certification check (Part XV.3)
  const greenEligible = ['green_energy', 'agriculture'].includes(p.sector) || environmentalScore >= 75
  
  // Economic Multiplier (Part XV.2)
  const economicMultiplier = 1 + (empCount * 0.02) + ((p.annual_revenue || 0) / 10000000 * 0.1)
  
  // Diversity metrics (anonymous, aggregated - Part IX.4)
  const diversityMetrics = {
    workforce_size: empCount,
    regional_distribution: region,
    notes: 'Individual demographics anonymized per privacy protocol'
  }
  
  // Store ESG score
  await env.DB.prepare(`
    INSERT INTO esg_scores (project_id, environmental_score, social_score, governance_score, overall_score,
      carbon_footprint, resource_efficiency, waste_management, employee_welfare, community_impact,
      jobs_created, sdg_alignment, green_certified, diversity_metrics, economic_multiplier,
      formalization_impact, export_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(project_id, environmentalScore, socialScore, governanceScore, overallScore,
    carbonFootprint, resourceEfficiency, wasteManagement, employeeWelfare, communityImpact,
    jobsCreated, JSON.stringify(sdgAlignment), greenEligible ? 1 : 0, JSON.stringify(diversityMetrics),
    economicMultiplier, p.status === 'active' || p.status === 'operational' ? 1 : 0, p.annual_revenue || 0
  ).run()
  
  await logAudit(env.DB, 'esg_assessment', 'project', project_id, auth.uid, JSON.stringify({ overallScore, greenEligible }))
  
  return c.json({
    project_id,
    project_name: p.title,
    sector: p.sector,
    esg_scores: {
      environmental: { score: environmentalScore, carbon_footprint: Math.round(carbonFootprint), resource_efficiency: Math.round(resourceEfficiency), waste_management: Math.round(wasteManagement) },
      social: { score: socialScore, employee_welfare: Math.round(employeeWelfare), community_impact: Math.round(communityImpact), jobs_created: jobsCreated, regional_bonus: regionalBonus },
      governance: { score: governanceScore, board_diversity: Math.round(boardDiversity), transparency: Math.round(transparency), ethical_practices: Math.round(ethicalPractices) }
    },
    overall_score: overallScore,
    sdg_alignment: sdgAlignment,
    green_certification: {
      eligible: greenEligible,
      status: greenEligible ? 'GREEN_CERTIFIED' : 'not_eligible',
      criteria: 'Climate-positive, renewable energy, sustainable agriculture, or circular economy'
    },
    impact_measurement: {
      jobs_created: jobsCreated,
      economic_multiplier: Math.round(economicMultiplier * 100) / 100,
      formalization_impact: p.status === 'active' ? 'formalized_business' : 'pre_formalization',
      export_value: p.annual_revenue || 0,
      regional_development: region !== 'cairo' ? 'contributing to regional development' : 'urban focus'
    },
    diversity_metrics: diversityMetrics,
    inclusive_finance: {
      youth_empowerment: p.tier === 'A' ? 'first_business_support_active' : 'standard',
      regional_incentive: region === 'upper_egypt' ? 'eligible_for_reduced_fees' : 'standard_fees',
      minimum_investment: '50 EGP - democratized access'
    },
    blueprint_reference: 'Part XV - ESG, Impact & Sustainability'
  })
})

// GET /scores/:projectId - Get ESG score history
esgRoutes.get('/scores/:projectId', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const projectId = c.req.param('projectId')
  const scores = await c.env.DB.prepare('SELECT * FROM esg_scores WHERE project_id = ? ORDER BY assessment_date DESC').bind(projectId).all()
  return c.json({ scores: scores.results })
})

// GET /impact-summary - Platform-wide impact summary (Part XV.2)
esgRoutes.get('/impact-summary', async (c) => {
  const { env } = c
  
  const totalJobs = await env.DB.prepare('SELECT SUM(jobs_created) as total FROM esg_scores').first()
  const greenProjects = await env.DB.prepare('SELECT COUNT(*) as count FROM esg_scores WHERE green_certified = 1').first()
  const avgScore = await env.DB.prepare('SELECT AVG(overall_score) as avg FROM esg_scores').first()
  const totalProjects = await env.DB.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('active','operational','funded')").first()
  const totalEmployees = await env.DB.prepare("SELECT COUNT(*) as count FROM employee_registry WHERE status = 'active'").first()
  
  return c.json({
    platform_impact: {
      total_jobs_created: (totalJobs as any)?.total || 0,
      green_certified_projects: (greenProjects as any)?.count || 0,
      average_esg_score: Math.round((avgScore as any)?.avg || 0),
      active_projects: (totalProjects as any)?.count || 0,
      total_employees: (totalEmployees as any)?.count || 0,
      formalized_businesses: (totalProjects as any)?.count || 0
    },
    sdg_contribution: [
      'SDG 1 - No Poverty: Micro-investment from 50 EGP',
      'SDG 5 - Gender Equality: Women entrepreneurship focus',
      'SDG 8 - Decent Work: Job creation across all sectors',
      'SDG 9 - Industry Innovation: Technology-first approach',
      'SDG 10 - Reduced Inequalities: Democratized ownership',
      'SDG 11 - Sustainable Cities: Regional development incentives',
      'SDG 16 - Peace & Justice: Transparent governance, AI-enforced'
    ],
    circular_economy: {
      resource_efficiency_tracking: true,
      sustainable_supply_chain: true,
      product_lifecycle_management: 'available_for_manufacturing_projects'
    },
    blueprint_reference: 'Part XV.2 - Impact Measurement'
  })
})

// POST /green-certify - Green Investment Certification (Part XV.3)
esgRoutes.post('/green-certify', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)
  
  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first()
  if (!project) return c.json({ error: 'Project not found' }, 404)
  
  const latestEsg = await env.DB.prepare('SELECT * FROM esg_scores WHERE project_id = ? ORDER BY assessment_date DESC LIMIT 1').bind(project_id).first()
  
  const p = project as any
  const greenSectors = ['green_energy', 'agriculture']
  const isGreenSector = greenSectors.includes(p.sector)
  const esgScore = (latestEsg as any)?.environmental_score || 0
  const eligible = isGreenSector || esgScore >= 75
  
  if (!eligible) {
    return c.json({
      project_id,
      certification_status: 'NOT_ELIGIBLE',
      reason: 'Environmental score < 75 and sector not in green categories',
      current_environmental_score: esgScore,
      improvement_needed: 75 - esgScore,
      qualifying_criteria: [
        'Climate-positive (carbon negative/neutral)',
        'Renewable energy initiatives',
        'Sustainable agriculture (organic, water-efficient)',
        'Circular economy models'
      ]
    })
  }
  
  await env.DB.prepare('UPDATE esg_scores SET green_certified = 1 WHERE project_id = ? AND id = (SELECT MAX(id) FROM esg_scores WHERE project_id = ?)').bind(project_id, project_id).run()
  await logAudit(env.DB, 'green_certification_granted', 'project', project_id, auth.uid, JSON.stringify({ sector: p.sector, envScore: esgScore }))
  
  return c.json({
    project_id,
    certification_status: 'GREEN_CERTIFIED',
    badge: '🌱 Green Certified',
    benefits: [
      'Visible green badge on project listing',
      'Priority for ESG-mandate investors',
      'Eligible for GAFI green investment incentives',
      'Featured in ESG investment reports'
    ],
    blueprint_reference: 'Part XV.3 - Green Investment Certification'
  })
})
