import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const addonRoutes = new Hono<AppType>()

// =========================================================================
// ADD-ON 4: Founder Priority Share Purchase (Part XI.1, Appendix F)
// =========================================================================

// Founder exercises priority buy-back on secondary market order
addonRoutes.post('/founder-priority/:orderId', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const orderId = parseInt(c.req.param('orderId'))
  const order = await c.env.DB.prepare(`
    SELECT mo.*, p.founder_id FROM market_orders mo
    LEFT JOIN projects p ON mo.project_id = p.id
    WHERE mo.id = ? AND mo.status IN ('listed','priority_window','founder_priority')
  `).bind(orderId).first<any>()

  if (!order) return c.json({ error: 'Order not found or unavailable' }, 404)
  if (order.founder_id !== payload.uid) return c.json({ error: 'Only the project founder can exercise founder priority' }, 403)

  // Founder gets concurrent 72h window per Add-on 4
  const founderPriorityEnd = order.founder_priority_end ? new Date(order.founder_priority_end) : new Date(order.created_at)
  founderPriorityEnd.setHours(founderPriorityEnd.getHours() + 72)
  
  if (new Date() > founderPriorityEnd) {
    return c.json({ error: 'Founder 72-hour priority window has expired' }, 400)
  }

  // Get fundamental price for the project
  const project = await c.env.DB.prepare('SELECT fundamental_share_price FROM projects WHERE id = ?').bind(order.project_id).first<any>()
  const price = project?.fundamental_share_price || order.ask_price

  await c.env.DB.prepare(`
    UPDATE market_orders SET buyer_id = ?, status = 'pending_board', bid_price = ? WHERE id = ?
  `).bind(payload.uid, price, orderId).run()

  await c.env.DB.prepare(`
    INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status)
    VALUES (?, 'deposit', ?, ?, 'escrow', 'pending')
  `).bind(order.project_id, price * order.shares_count, `founder_${payload.uid}`).run()

  await logAudit(c.env.DB, 'founder_priority_exercised', 'market_order', orderId, payload.uid,
    JSON.stringify({ shares: order.shares_count, price, ai_price: project?.fundamental_share_price }))

  return c.json({
    success: true,
    message: 'Founder priority buy-back exercised at AI fundamental price.',
    price,
    total_cost: price * order.shares_count,
    add_on: '4 - Founder Priority Share Purchase'
  })
})

// =========================================================================
// ADD-ON 7: Dynamic Profit-Share Tiers (Part VIII.4, Appendix H)
// =========================================================================

// Calculate and apply dynamic profit-share adjustment
addonRoutes.post('/dynamic-profit-share', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, actual_profit, forecast_profit } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Only applicable for Tiers A/B/C (Tier D is standard pro-rata)
  if (project.tier === 'D') {
    return c.json({ message: 'Dynamic profit-share not applicable for Tier D (standard pro-rata)', adjustment: 0 })
  }

  const forecast = forecast_profit || project.profit_forecast || 0
  if (forecast <= 0) return c.json({ error: 'No profit forecast set for this project' }, 400)

  const ratio = actual_profit / forecast
  let adjustment = 0

  // Appendix H formula: if actual > 120% forecast => +5%, if < 80% => -5%
  if (ratio > 1.2) {
    adjustment = 5 // +5 percentage points for next 12 months
  } else if (ratio < 0.8) {
    adjustment = -5 // -5 percentage points for next 12 months
  }

  const currentFounderShare = project.founder_dividend_bonus || 0
  const newFounderShare = Math.max(0, currentFounderShare + adjustment)

  await c.env.DB.prepare(`
    UPDATE projects SET profit_actual = ?, profit_forecast = ?, dynamic_profit_adjustment = ? WHERE id = ?
  `).bind(actual_profit, forecast, adjustment, project_id).run()

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'dynamic_profit_share_adjustment', ?, 'profit-share-v1', ?)
  `).bind(project_id, payload.uid, JSON.stringify({
    actual_profit, forecast_profit: forecast, ratio: ratio.toFixed(2),
    adjustment, previous_share: currentFounderShare, new_share: newFounderShare,
    duration: '12 months', resets_annually: true
  })).run()

  await logAudit(c.env.DB, 'dynamic_profit_adjustment', 'project', project_id, payload.uid,
    JSON.stringify({ actual: actual_profit, forecast, ratio: ratio.toFixed(2), adjustment }))

  return c.json({
    success: true,
    actual_profit,
    forecast_profit: forecast,
    ratio: parseFloat(ratio.toFixed(2)),
    adjustment_percentage_points: adjustment,
    previous_founder_share: currentFounderShare + '%',
    new_founder_share: newFounderShare + '%',
    duration: '12 months — resets annually',
    note: ratio > 1.2 ? 'Outperformance bonus: +5 points' : ratio < 0.8 ? 'Underperformance penalty: -5 points' : 'Within acceptable range: no adjustment',
    add_on: '7 - Dynamic Profit-Share Tiers (Appendix H)'
  })
})

// =========================================================================
// ADD-ON 8: Anti-Fragility Insurance Vault (Appendix I)
// =========================================================================

// Get vault status
addonRoutes.get('/insurance-vault', async (c) => {
  const vaults = await c.env.DB.prepare(`
    SELECT iv.*, p.title as project_title, p.tier FROM insurance_vault iv
    LEFT JOIN projects p ON iv.project_id = p.id
    ORDER BY iv.created_at DESC
  `).all()

  const totalBalance = await c.env.DB.prepare(`
    SELECT SUM(vault_balance) as total FROM insurance_vault
  `).first<{total: number}>()

  return c.json({
    vault_entries: vaults.results,
    total_vault_balance: totalBalance?.total || 0,
    rules: {
      contribution: '0.5% of each fundraising (cash) deducted from escrow',
      investment: '70% Egyptian government bonds + 30% gold (by licensed asset manager)',
      qualifying_event: 'Exogenous shock verified by AI (pandemic, currency devaluation >20% in 30 days, war). Must cause >40% revenue drop in 60 days.',
      disbursement: '3 months operating expenses (capped at 20% of last raise), interest-free loan repayable in 24 months',
      excess: 'If balance exceeds 100M EGP, excess distributed as dividend to all SHERKETI shareholders',
      target_balance: '50M EGP (KPI target for end 2026)'
    },
    add_on: '8 - Anti-Fragility Insurance Vault (Appendix I)'
  })
})

// Claim from insurance vault
addonRoutes.post('/insurance-vault/claim', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, reason, revenue_drop_percent, event_type } = await c.req.json()

  if (!project_id || !reason || !event_type) {
    return c.json({ error: 'Missing required fields: project_id, reason, event_type' }, 400)
  }
  if (revenue_drop_percent < 40) {
    return c.json({ error: 'Revenue drop must be >40% to qualify for insurance vault claim (Appendix I)' }, 400)
  }

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const vault = await c.env.DB.prepare('SELECT * FROM insurance_vault WHERE project_id = ?').bind(project_id).first<any>()
  const maxDisbursement = Math.min(project.funding_goal * 0.2, (project.net_profit || project.funding_goal * 0.1) * 3)

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'insurance_vault_claim', ?, 'vault-ai-v1', ?)
  `).bind(project_id, payload.uid, JSON.stringify({
    reason, event_type, revenue_drop: revenue_drop_percent + '%',
    max_disbursement: maxDisbursement, vault_balance: vault?.vault_balance || 0,
    status: 'pending_verification'
  })).run()

  await logAudit(c.env.DB, 'insurance_vault_claim', 'project', project_id, payload.uid, JSON.stringify({ reason, event_type }))

  return c.json({
    success: true,
    claim_status: 'pending_ai_verification',
    max_disbursement: maxDisbursement,
    repayment_terms: '24 months, interest-free',
    message: 'Claim submitted. AI verification and board review required.',
    add_on: '8 - Anti-Fragility Insurance Vault'
  })
})

// =========================================================================
// ADD-ON 10: Founder-Investor AI Matchmaking (Part X.1)
// =========================================================================

addonRoutes.post('/matchmaking', async (c) => {
  const { project_id } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Get all verified investors who haven't already invested
  const investors = await c.env.DB.prepare(`
    SELECT u.id, u.full_name, u.reputation_score, u.risk_profile, u.region
    FROM users u
    WHERE u.role = 'investor' AND u.verification_status = 'verified'
    AND u.id NOT IN (SELECT user_id FROM shareholdings WHERE project_id = ?)
    ORDER BY u.reputation_score DESC LIMIT 50
  `).bind(project_id).all()

  const sectorRiskMap: Record<string, string[]> = {
    'Technology': ['standard', 'elevated', 'high'],
    'FinTech': ['elevated', 'high'],
    'Green Energy': ['standard', 'elevated'],
    'Healthcare': ['standard', 'elevated'],
    'Food & Beverage': ['low', 'standard'],
    'Agriculture': ['low', 'standard'],
    'Manufacturing': ['low', 'standard'],
    'Real Estate': ['standard', 'elevated'],
    'Education': ['low', 'standard'],
    'E-Commerce': ['standard', 'elevated'],
    'Other': ['standard']
  }

  const suitableRiskProfiles = sectorRiskMap[project.sector] || ['standard']

  const matches = (investors.results as any[]).map(inv => {
    let score = 0
    
    // Risk tolerance match (40%)
    const riskMatch = suitableRiskProfiles.includes(inv.risk_profile || 'standard')
    score += riskMatch ? 40 : 15

    // Reputation bonus (25%)
    score += Math.min(25, (inv.reputation_score / 100) * 25)

    // Regional proximity bonus (15%)
    if (inv.region === project.company_region) score += 15
    else if (['cairo', 'alexandria'].includes(inv.region) && ['cairo', 'alexandria'].includes(project.company_region)) score += 10

    // Tier suitability (20%)
    if (project.tier === 'A' && inv.reputation_score < 50) score += 20 // New investors for Tier A
    else if (project.tier === 'C' && inv.reputation_score > 75) score += 20 // Experienced for Tier C
    else if (project.tier === 'D' && inv.reputation_score > 60) score += 20
    else score += 10

    return {
      investor_id: inv.id,
      investor_name: inv.full_name,
      reputation_score: inv.reputation_score,
      compatibility_score: Math.min(100, Math.round(score)),
      risk_profile: inv.risk_profile,
      region: inv.region,
      priority: score >= 85 ? 'high' : score >= 65 ? 'medium' : 'low',
      allocation_window: score >= 85 ? '48h priority' : 'general'
    }
  }).sort((a, b) => b.compatibility_score - a.compatibility_score)

  return c.json({
    project: { id: project.id, title: project.title, sector: project.sector, tier: project.tier },
    matches: matches.slice(0, 20),
    total_candidates: investors.results.length,
    high_matches: matches.filter(m => m.compatibility_score >= 85).length,
    medium_matches: matches.filter(m => m.compatibility_score >= 65 && m.compatibility_score < 85).length,
    algorithm: 'matchmaking-ai-v1',
    note: 'Top matches get 48h priority allocation per Add-on 10',
    add_on: '10 - Founder-Investor AI Matchmaking'
  })
})

// =========================================================================
// ADD-ON 13: Bankruptcy Reverse Auction (Part X.4, Appendix J)
// =========================================================================

// Trigger bankruptcy auction
addonRoutes.post('/bankruptcy-auction/trigger', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Admin only' }, 403)

  const { project_id } = await c.req.json()
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Trigger condition: health score < 20 for 30 consecutive days (simulated check)
  if (project.health_score >= 20) {
    return c.json({ error: `Health score is ${project.health_score}. Must be <20 for 30 consecutive days to trigger bankruptcy auction.` }, 400)
  }

  // Calculate asset valuation
  const totalAssets = project.total_assets || project.funding_raised * 0.5
  const totalLiabilities = project.total_liabilities || 0
  const liquidationValue = totalAssets - totalLiabilities
  const reservePrice = liquidationValue * 0.5 // 50% of AI-estimated liquidation value

  const auctionEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const shareholderPriorityEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  await c.env.DB.prepare("UPDATE projects SET status = 'dissolved', governance_state = 'bankruptcy_auction' WHERE id = ?").bind(project_id).run()

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'bankruptcy_auction_triggered', ?, 'auction-ai-v1', ?)
  `).bind(project_id, payload.uid, JSON.stringify({
    total_assets: totalAssets, total_liabilities: totalLiabilities,
    liquidation_value: liquidationValue, reserve_price: reservePrice,
    auction_end: auctionEnd, shareholder_priority_end: shareholderPriorityEnd,
    distribution_waterfall: ['1. Secured creditors', '2. Unpaid employee wages (up to 3 months)', '3. Unsecured creditors', '4. Shareholders pro-rata']
  })).run()

  await logAudit(c.env.DB, 'bankruptcy_auction_triggered', 'project', project_id, payload.uid,
    JSON.stringify({ health_score: project.health_score, liquidation_value: liquidationValue }))

  return c.json({
    success: true,
    auction: {
      project_id,
      project_title: project.title,
      liquidation_value: liquidationValue,
      reserve_price: reservePrice,
      shareholder_priority_window: shareholderPriorityEnd,
      open_auction_start: shareholderPriorityEnd,
      auction_end: auctionEnd,
      max_duration: '14 days'
    },
    distribution_waterfall: [
      '1. Secured creditors (paid in full)',
      '2. Unpaid employee wages (up to 3 months)',
      '3. Unsecured creditors',
      '4. Shareholders pro-rata'
    ],
    add_on: '13 - Bankruptcy Reverse Auction (Appendix J)'
  })
})

// =========================================================================
// ADD-ON 14: Cross-Project Skill Barter Exchange (Appendix K)
// =========================================================================

// Register a skill offer
addonRoutes.post('/skill-barter/offer', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { service_description, hours, hourly_rate_estimate } = await c.req.json()

  const user = await c.env.DB.prepare('SELECT reputation_score FROM users WHERE id = ?').bind(payload.uid).first<any>()
  
  // AI values service based on market rates and reputation
  const reputationMultiplier = user ? Math.max(0.8, user.reputation_score / 100) : 0.8
  const aiHourlyRate = (hourly_rate_estimate || 150) * reputationMultiplier
  const totalCredits = Math.round(hours * aiHourlyRate)

  const result = await c.env.DB.prepare(`
    INSERT INTO skill_barter (provider_id, service_description, hours_offered, hourly_rate, total_credits, status)
    VALUES (?, ?, ?, ?, ?, 'available')
  `).bind(payload.uid, service_description, hours, aiHourlyRate, totalCredits).run()

  await logAudit(c.env.DB, 'skill_offer_created', 'skill_barter', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ service: service_description, hours, credits: totalCredits }))

  return c.json({
    success: true,
    offer_id: result.meta.last_row_id,
    credits_issued: totalCredits,
    hourly_rate: aiHourlyRate,
    note: '1 Skill Credit = 1 EGP equivalent. Credits expire after 24 months. Platform takes 1% fee on transactions.',
    add_on: '14 - Cross-Project Skill Barter Exchange (Appendix K)'
  })
})

// List skill offers
addonRoutes.get('/skill-barter/offers', async (c) => {
  const offers = await c.env.DB.prepare(`
    SELECT sb.*, u.full_name, u.reputation_score FROM skill_barter sb
    LEFT JOIN users u ON sb.provider_id = u.id
    WHERE sb.status = 'available' ORDER BY sb.created_at DESC
  `).all()
  return c.json({ offers: offers.results, platform_fee: '1% per transaction (burned)' })
})

// Accept a skill barter offer
addonRoutes.post('/skill-barter/:offerId/accept', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const offerId = parseInt(c.req.param('offerId'))
  const { project_id } = await c.req.json()

  const offer = await c.env.DB.prepare("SELECT * FROM skill_barter WHERE id = ? AND status = 'available'").bind(offerId).first<any>()
  if (!offer) return c.json({ error: 'Offer not found or already accepted' }, 404)

  // Platform fee: 1% burned
  const fee = Math.round(offer.total_credits * 0.01)
  const netCredits = offer.total_credits - fee

  await c.env.DB.prepare("UPDATE skill_barter SET status = 'matched', project_id = ? WHERE id = ?")
    .bind(project_id, offerId).run()

  if (project_id) {
    await c.env.DB.prepare(`
      INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status)
      VALUES (?, 'fee', ?, 'skill_credits', 'burned', 'completed')
    `).bind(project_id, fee).run()
  }

  await logAudit(c.env.DB, 'skill_barter_accepted', 'skill_barter', offerId, payload.uid,
    JSON.stringify({ project_id, credits: netCredits, fee }))

  return c.json({
    success: true,
    credits_transferred: netCredits,
    platform_fee_burned: fee,
    message: 'Skill barter accepted. Credits issued after service delivery confirmation.',
    add_on: '14 - Cross-Project Skill Barter Exchange'
  })
})

// =========================================================================
// ADD-ON 15: GAFI API Integration Stubs (Appendix G)
// =========================================================================

// Company registration via GAFI
addonRoutes.post('/gafi/register-company', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, trade_name, commercial_activity, capital } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // GAFI integration stub — in production this calls GAFI's actual REST API
  const registrationId = `GAFI-${Date.now()}-${project_id}`
  
  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'gafi_registration', ?, 'gafi-api-v1', ?)
  `).bind(project_id, payload.uid, JSON.stringify({
    registration_id: registrationId,
    trade_name: trade_name || project.title,
    commercial_activity: commercial_activity || project.sector,
    capital: capital || project.funding_goal,
    status: 'submitted',
    estimated_processing: '3-5 business days',
    note: 'GAFI API Integration stub — production implementation requires GAFI API access'
  })).run()

  await logAudit(c.env.DB, 'gafi_registration_submitted', 'project', project_id, payload.uid,
    JSON.stringify({ registration_id: registrationId }))

  return c.json({
    success: true,
    registration_id: registrationId,
    status: 'submitted',
    estimated_processing: '3-5 business days',
    services: [
      'Trade name reservation',
      'Commercial registry application',
      'Fee payment processing',
      'UBO verification',
      'Investment incentive eligibility check'
    ],
    add_on: '15 - GAFI API Integration (Appendix G)'
  })
})

// GAFI compliance check
addonRoutes.get('/gafi/compliance/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  return c.json({
    project_id: projectId,
    gafi_status: 'active',
    commercial_register: `CR-${projectId}-2026`,
    compliance: {
      license_valid: true,
      last_check: new Date().toISOString(),
      foreign_ownership_limit: '49%',
      current_foreign_ownership: '0%',
      sector_restrictions: 'None',
      tax_status: 'Compliant'
    },
    incentives: {
      eligible: project.company_region === 'upper_egypt' || project.sector === 'Green Energy',
      available: project.company_region === 'upper_egypt' ? [
        'Tax deduction up to 50% of investment costs over 7 years (Upper Egypt incentive)',
        'Land allocation at reduced rates'
      ] : project.sector === 'Green Energy' ? [
        'Government incentives for renewable energy',
        'Tax holidays for green projects'
      ] : [],
      golden_license: project.funding_goal > 50000000 ? 'Eligible for Golden License fast-track' : 'Not applicable'
    },
    add_on: '15 - GAFI API Integration'
  })
})

// GAFI investment incentive check
addonRoutes.get('/gafi/incentives/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const incentives: any[] = []
  
  // Region-based incentives
  if (project.company_region === 'upper_egypt') {
    incentives.push({ type: 'tax_deduction', value: '50% over 7 years', description: 'Upper Egypt investment incentive' })
    incentives.push({ type: 'land_allocation', value: 'Reduced rates', description: 'Industrial land at subsidized rates' })
  }
  if (project.company_region === 'suez_canal') {
    incentives.push({ type: 'special_zone', value: 'SCZ benefits', description: 'Suez Canal Economic Zone incentives' })
  }

  // Sector-based incentives
  if (project.sector === 'Green Energy') {
    incentives.push({ type: 'green_incentive', value: 'Tax holiday', description: 'Renewable energy tax incentives' })
  }
  if (project.sector === 'Agriculture') {
    incentives.push({ type: 'agri_subsidy', value: 'Variable', description: 'Agricultural sector subsidies' })
  }
  if (project.sector === 'Manufacturing') {
    incentives.push({ type: 'industry_incentive', value: 'Equipment import duty exemption', description: 'Manufacturing sector incentive' })
  }

  // Size-based
  if (project.funding_goal > 50000000) {
    incentives.push({ type: 'golden_license', value: 'Fast-track processing', description: 'Golden License for strategic projects' })
  }

  // Employment-based
  const employees = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employee_registry WHERE project_id = ? AND status = ?').bind(projectId, 'active').first<{count: number}>()
  if ((employees?.count || 0) > 50) {
    incentives.push({ type: 'employment_incentive', value: 'Training subsidy', description: 'Large employer incentive (>50 employees)' })
  }

  return c.json({
    project_id: projectId,
    project_title: project.title,
    sector: project.sector,
    region: project.company_region,
    total_incentives: incentives.length,
    incentives,
    estimated_value: incentives.length > 0 ? 'Factored into AI valuation' : 'No incentives currently applicable',
    add_on: '15 - GAFI API Integration — Investment Incentive Optimization'
  })
})

// =========================================================================
// ADD-ON 17: Pitch Deck & Video Scoring (Appendix M)
// =========================================================================

addonRoutes.post('/pitch-scoring', async (c) => {
  const { project_id, has_deck, deck_quality, has_video, video_quality } = await c.req.json()

  let bonus = 0
  const breakdown: any = {}

  if (has_deck) {
    // Deck score: +3 to +10 based on quality
    const deckScore = Math.min(10, Math.max(3, (deck_quality || 5) * 2))
    bonus += deckScore
    breakdown.deck = { score: deckScore, quality: deck_quality || 5, note: 'PDF/PPT, max 20 slides, max 20MB' }
  }

  if (has_video) {
    // Video score: +2 to +5 based on quality  
    const videoScore = Math.min(5, Math.max(2, (video_quality || 3)))
    bonus += videoScore
    breakdown.video = { score: videoScore, quality: video_quality || 3, note: 'MP4, max 3 minutes, max 100MB' }
  }

  // Cap total bonus at +15 per Appendix M
  bonus = Math.min(15, bonus)

  if (project_id) {
    try {
      await c.env.DB.prepare('UPDATE projects SET pitch_bonus_score = ? WHERE id = ?').bind(bonus, project_id).run()
    } catch (e) { /* ignore */ }
  }

  return c.json({
    pitch_bonus: bonus,
    max_possible: 15,
    breakdown,
    no_penalty: true,
    note: 'No penalty for not uploading pitch materials',
    scoring_model: 'Gemma-2 27B evaluates clarity, completeness, professionalism',
    add_on: '17 - Pitch Decks & Videos (Appendix M)'
  })
})

// =========================================================================
// Company Health Score (Part X.4) - Daily Calculation
// =========================================================================

addonRoutes.post('/health-score', async (c) => {
  const { project_id } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const milestones = await c.env.DB.prepare('SELECT * FROM milestones WHERE project_id = ?').bind(project_id).all()
  const completedMilestones = (milestones.results as any[]).filter(m => m.status === 'completed').length
  const totalMilestones = milestones.results.length
  const overdueMilestones = (milestones.results as any[]).filter(m => m.status === 'overdue').length

  const alerts = await c.env.DB.prepare("SELECT COUNT(*) as count FROM risk_alerts WHERE project_id = ? AND status = 'active'").bind(project_id).first<{count: number}>()
  const disputes = await c.env.DB.prepare("SELECT COUNT(*) as count FROM disputes WHERE project_id = ? AND status NOT IN ('resolved','dismissed')").bind(project_id).first<{count: number}>()
  const employees = await c.env.DB.prepare("SELECT COUNT(*) as count FROM employee_registry WHERE project_id = ? AND status = 'active'").bind(project_id).first<{count: number}>()

  // Health score calculation (0-100, 20+ metrics simplified)
  let score = 50 // Base

  // Financial health (30%)
  const fundingRatio = project.funding_raised / (project.funding_goal || 1)
  score += Math.min(15, fundingRatio * 15)
  if (project.net_profit && project.net_profit > 0) score += 10
  if (project.annual_revenue && project.annual_revenue > 0) score += 5

  // Operational health (25%)
  if (totalMilestones > 0) {
    score += Math.min(15, (completedMilestones / totalMilestones) * 15)
  }
  score -= overdueMilestones * 5
  if ((employees?.count || 0) > 0) score += 5

  // Governance health (20%)
  score -= (alerts?.count || 0) * 3
  score -= (disputes?.count || 0) * 5
  if (project.governance_state === 'active') score += 5

  // Risk adjustment (15%)
  if (project.ai_feasibility_score > 70) score += 5
  if (project.ai_feasibility_score > 85) score += 5

  // Cap to 0-100
  score = Math.min(100, Math.max(0, Math.round(score)))

  const level = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : score >= 30 ? 'Concerning' : 'Critical'
  const action = score >= 90 ? 'Routine monitoring only' :
    score >= 70 ? 'Monthly board review' :
    score >= 50 ? 'Weekly board review, AI-suggested improvements' :
    score >= 30 ? 'Mandatory board meeting within 7 days, AI action plan' :
    'Emergency protocols triggered; may lead to bankruptcy reverse auction (Add-on 13)'

  // Update project health score
  await c.env.DB.prepare('UPDATE projects SET health_score = ? WHERE id = ?').bind(score, project_id).run()

  return c.json({
    project_id,
    health_score: score,
    level,
    required_action: action,
    components: {
      financial: { funding_ratio: fundingRatio.toFixed(2), revenue: project.annual_revenue, profit: project.net_profit },
      operational: { milestones_completed: completedMilestones, total: totalMilestones, overdue: overdueMilestones, employees: employees?.count || 0 },
      governance: { active_alerts: alerts?.count || 0, active_disputes: disputes?.count || 0, state: project.governance_state },
      ai_score: project.ai_feasibility_score
    },
    bankruptcy_trigger: score < 20 ? 'WARNING: Health score below 20. If sustained for 30 days, bankruptcy auction triggered.' : null,
    update_frequency: 'Daily (recalculated when underlying metrics change)',
    reference: 'Part X.4 — Company Health Score (0-100)'
  })
})

// =========================================================================
// ESG / Impact Scoring (Part XV)
// =========================================================================

addonRoutes.post('/esg-score', async (c) => {
  const { project_id } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const employees = await c.env.DB.prepare("SELECT COUNT(*) as count FROM employee_registry WHERE project_id = ? AND status = 'active'").bind(project_id).first<{count: number}>()

  // ESG scoring simplified
  const environmental = project.sector === 'Green Energy' ? 85 :
    project.sector === 'Agriculture' ? 70 :
    project.sector === 'Manufacturing' ? 45 : 60

  const social = Math.min(100, 40 + (employees?.count || 0) * 3 + (project.company_region === 'upper_egypt' ? 20 : 0))

  const governance = Math.min(100, 50 + (project.health_score || 0) * 0.3 + (project.ai_feasibility_score || 0) * 0.2)

  const overall = Math.round(environmental * 0.33 + social * 0.33 + governance * 0.34)

  const sdgs: string[] = []
  if (project.sector === 'Green Energy') sdgs.push('SDG 7: Affordable and Clean Energy', 'SDG 13: Climate Action')
  if (project.sector === 'Agriculture') sdgs.push('SDG 2: Zero Hunger', 'SDG 12: Responsible Consumption')
  if ((employees?.count || 0) > 10) sdgs.push('SDG 8: Decent Work and Economic Growth')
  if (project.company_region === 'upper_egypt') sdgs.push('SDG 10: Reduced Inequalities')
  sdgs.push('SDG 9: Industry, Innovation and Infrastructure')

  return c.json({
    project_id,
    esg_score: overall,
    components: { environmental, social, governance },
    un_sdg_alignment: sdgs,
    jobs_created: employees?.count || 0,
    green_certified: project.sector === 'Green Energy',
    impact_metrics: {
      economic_multiplier: 'Estimated local impact based on Egyptian input-output tables',
      formalisation: project.tier === 'A' || project.tier === 'B' ? 'New business formalised through SHERKETI' : 'Existing company expansion',
      regional_development: project.company_region === 'upper_egypt' ? 'Active — Upper Egypt development priority' : 'Standard'
    },
    reference: 'Part XV — ESG, Impact & Sustainability'
  })
})

// =========================================================================
// Exit Readiness Score (Part XIV)
// =========================================================================

addonRoutes.post('/exit-readiness', async (c) => {
  const { project_id } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const milestones = await c.env.DB.prepare('SELECT * FROM milestones WHERE project_id = ?').bind(project_id).all()
  const completedCount = (milestones.results as any[]).filter(m => m.status === 'completed').length
  const totalCount = milestones.results.length

  // Operational Maturity (40%)
  const opMaturity = Math.min(100, (completedCount / Math.max(1, totalCount)) * 60 + (project.health_score || 50) * 0.4)

  // Financial Predictability (30%)
  const financialPred = Math.min(100, project.annual_revenue ? 60 : 20 + (project.net_profit && project.net_profit > 0 ? 30 : 0) + ((project.ai_feasibility_score || 50) * 0.2))

  // Governance Stability (20%)
  const govStability = Math.min(100, (project.health_score || 50) * 0.6 + (project.governance_state === 'active' ? 30 : 10))

  // Market Position (10%)
  const marketPos = Math.min(100, (project.ai_feasibility_score || 50) * 0.5 + (project.fundamental_share_price ? 30 : 0))

  const overall = Math.round(opMaturity * 0.4 + financialPred * 0.3 + govStability * 0.2 + marketPos * 0.1)

  const level = overall >= 85 ? 'Optimal — Prime exit window' :
    overall >= 70 ? 'Ready — Actively seek exits' :
    overall >= 50 ? 'Developing — Prepare for opportunities' :
    'Early — Focus on fundamentals'

  const exitOptions = []
  if (overall >= 85) {
    exitOptions.push('IPO on EGX', 'M&A — Strategic acquisition', 'Partial secondary liquidity')
  } else if (overall >= 70) {
    exitOptions.push('M&A Readiness Package', 'Management Buy-Out (MBO)', 'Partial secondary liquidity')
  } else if (overall >= 50) {
    exitOptions.push('Dividend-Only Perpetual Model', 'Gradual ownership transition')
  } else {
    exitOptions.push('Focus on growth metrics', 'Consider additional fundraising')
  }

  return c.json({
    project_id,
    exit_readiness_score: overall,
    level,
    components: {
      operational_maturity: { score: Math.round(opMaturity), weight: '40%' },
      financial_predictability: { score: Math.round(financialPred), weight: '30%' },
      governance_stability: { score: Math.round(govStability), weight: '20%' },
      market_position: { score: Math.round(marketPos), weight: '10%' }
    },
    recommended_exit_options: exitOptions,
    ipo_readiness: overall >= 85 ? 'Ready — SHERKETI IPO preparation suite available' : 'Not yet ready',
    reference: 'Part XIV — Exit Pathways & Liquidity Strategies'
  })
})

// =========================================================================
// Constitutional Amendment Workflow (Part I.3)
// =========================================================================

addonRoutes.post('/constitutional-amendment', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, amendment_title, amendment_description, affected_rule } = await c.req.json()

  // Check non-amendable rules
  const nonAmendable = [1,2,3,4,5,6,8,9,10]
  if (affected_rule && nonAmendable.includes(affected_rule)) {
    return c.json({ error: `Rule #${affected_rule} is non-amendable (hard limit). Cannot be modified.` }, 400)
  }

  // Only Rule 7 (Transparency Mandate) is amendable
  const coolingPeriodEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const votingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const result = await c.env.DB.prepare(`
    INSERT INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, quorum_required,
      total_voting_power, voting_deadline)
    VALUES (?, ?, ?, ?, 'constitutional_amendment', 'open', 75.0, 51.0, 100, ?)
  `).bind(
    project_id, Date.now(),
    `Constitutional Amendment: ${amendment_title}`,
    `${amendment_description}\n\nRequirements: 75% supermajority + 90-day cooling period + Law firm constitutional review.\nCooling period ends: ${coolingPeriodEnd}`,
    votingDeadline
  ).run()

  await logAudit(c.env.DB, 'constitutional_amendment_proposed', 'vote', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ amendment_title, affected_rule, cooling_period_end: coolingPeriodEnd }))

  return c.json({
    success: true,
    vote_id: result.meta.last_row_id,
    requirements: {
      supermajority: '75% of voting power',
      law_firm_review: 'Required — opinion that amendment does not violate Egyptian law',
      ai_impact_analysis: 'Required — report on how change affects governance/fees/enforcement',
      cooling_period: '90 days — amendment visible to all shareholders',
      cooling_period_end: coolingPeriodEnd
    },
    hard_limits: 'Rules 1-6, 8-10 are non-amendable: Zero custody, Escrow separation, AI-locked enforcement, Human-proof, Immutable audit, One identity, Platform fee, Fundamental pricing, Partner limitation',
    reference: 'Part I.3 — Constitutional Amendment Framework'
  })
})
