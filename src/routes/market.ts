import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const marketRoutes = new Hono<AppType>()

// List market orders
marketRoutes.get('/orders', async (c) => {
  const projectId = c.req.query('project_id')
  const status = c.req.query('status')

  let query = `SELECT mo.*, p.title as project_title, u.full_name as seller_name
    FROM market_orders mo 
    LEFT JOIN projects p ON mo.project_id = p.id
    LEFT JOIN users u ON mo.seller_id = u.id WHERE 1=1`
  const params: any[] = []

  if (projectId) { query += ' AND mo.project_id = ?'; params.push(parseInt(projectId)) }
  if (status) { query += ' AND mo.status = ?'; params.push(status) }
  query += ' ORDER BY mo.created_at DESC'

  const orders = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ orders: orders.results })
})

// Create sell order
marketRoutes.post('/sell', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, shares_count, ask_price } = await c.req.json()

  // Verify shareholding
  const shareholding = await c.env.DB.prepare(`
    SELECT * FROM shareholdings WHERE project_id = ? AND user_id = ? AND status = 'active'
  `).bind(project_id, payload.uid).first<any>()

  if (!shareholding || shareholding.shares_count < shares_count) {
    return c.json({ error: 'Insufficient shares' }, 400)
  }

  const equityPercent = (shares_count / shareholding.shares_count) * shareholding.equity_percentage
  const priorityWindowEnd = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  // AI Dynamic Valuation
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  const aiValuation = project ? (project.pre_money_valuation / 10000) * (project.health_score / 100) * 0.85 : ask_price // 15% liquidity discount

  const result = await c.env.DB.prepare(`
    INSERT INTO market_orders (project_id, seller_id, shares_count, equity_percentage, ask_price, ai_valuation, status, priority_window_end)
    VALUES (?, ?, ?, ?, ?, ?, 'priority_window', ?)
  `).bind(project_id, payload.uid, shares_count, equityPercent, ask_price, aiValuation, priorityWindowEnd).run()

  // Notify existing shareholders (72h first right of refusal)
  const shareholders = await c.env.DB.prepare(`
    SELECT DISTINCT user_id FROM shareholdings WHERE project_id = ? AND user_id != ? AND status = 'active'
  `).bind(project_id, payload.uid).all()

  for (const sh of shareholders.results as any[]) {
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, project_id, notification_type, title, message, action_url)
      VALUES (?, ?, 'market_priority', 'Shares Available - First Right of Refusal', ?, '/dashboard/market')
    `).bind(sh.user_id, project_id, `${shares_count} shares (${equityPercent.toFixed(2)}%) available at ${ask_price} EGP/share. You have 72h priority.`).run()
  }

  await logAudit(c.env.DB, 'sell_order_created', 'market_order', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ shares_count, ask_price, ai_valuation: aiValuation }))

  return c.json({
    success: true,
    orderId: result.meta.last_row_id,
    ai_valuation: aiValuation,
    priority_window_end: priorityWindowEnd,
    message: '72-hour priority window for existing shareholders started.'
  })
})

// Buy shares (secondary market)
marketRoutes.post('/buy/:orderId', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const orderId = parseInt(c.req.param('orderId'))
  const order = await c.env.DB.prepare("SELECT * FROM market_orders WHERE id = ? AND status IN ('listed','priority_window')").bind(orderId).first<any>()
  
  if (!order) return c.json({ error: 'Order not found or unavailable' }, 404)

  // Check priority window
  if (order.status === 'priority_window') {
    const isShareholder = await c.env.DB.prepare(`
      SELECT * FROM shareholdings WHERE project_id = ? AND user_id = ? AND status = 'active'
    `).bind(order.project_id, payload.uid).first()
    
    if (!isShareholder && new Date(order.priority_window_end) > new Date()) {
      return c.json({ error: '72h priority window active. Only existing shareholders can buy.' }, 403)
    }
  }

  // Update order
  await c.env.DB.prepare(`
    UPDATE market_orders SET buyer_id = ?, status = 'pending_board', bid_price = ask_price WHERE id = ?
  `).bind(payload.uid, orderId).run()

  // Create board approval vote
  await c.env.DB.prepare(`
    INSERT INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, total_voting_power, voting_deadline)
    VALUES (?, ?, 'Secondary Market Transfer Approval', ?, 'board_resolution', 'open', 50.0, 100, datetime('now', '+48 hours'))
  `).bind(order.project_id, Date.now(), `Approve transfer of ${order.shares_count} shares from seller to buyer`).run()

  // Create escrow transaction
  await c.env.DB.prepare(`
    INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status)
    VALUES (?, 'deposit', ?, ?, 'escrow', 'pending')
  `).bind(order.project_id, order.ask_price * order.shares_count, `buyer_${payload.uid}`).run()

  await logAudit(c.env.DB, 'buy_order_placed', 'market_order', orderId, payload.uid,
    JSON.stringify({ shares: order.shares_count, price: order.ask_price }))

  return c.json({ success: true, message: 'Buy order placed. Board approval and law firm stamping required.' })
})

// Get market stats
marketRoutes.get('/stats/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))

  const activeOrders = await c.env.DB.prepare(`
    SELECT COUNT(*) as count, SUM(shares_count) as total_shares, AVG(ask_price) as avg_price
    FROM market_orders WHERE project_id = ? AND status IN ('listed','priority_window')
  `).bind(projectId).first()

  const completedTrades = await c.env.DB.prepare(`
    SELECT COUNT(*) as count, SUM(shares_count * ask_price) as volume
    FROM market_orders WHERE project_id = ? AND status = 'completed'
  `).bind(projectId).first()

  return c.json({ active_orders: activeOrders, completed_trades: completedTrades })
})

// =========================================================================
// FIFO Order Matching (Part XI.3) - Single price, no bids/asks
// =========================================================================

marketRoutes.post('/match-orders', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Admin access required' }, 403)

  const { project_id } = await c.req.json()

  // Get current fundamental price
  const project = await c.env.DB.prepare('SELECT fundamental_share_price FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project?.fundamental_share_price) {
    return c.json({ error: 'No fundamental price set for this project. Use /api/ai/fundamental-price first.' }, 400)
  }

  const aiPrice = project.fundamental_share_price
  const priceLow = aiPrice * 0.95
  const priceHigh = aiPrice * 1.05

  // Get sell orders (FIFO by creation date)
  const sellOrders = await c.env.DB.prepare(`
    SELECT * FROM market_orders WHERE project_id = ? AND status IN ('listed','priority_window')
    AND ask_price BETWEEN ? AND ?
    ORDER BY created_at ASC
  `).bind(project_id, priceLow, priceHigh).all()

  // Get pending buy orders
  const buyOrders = await c.env.DB.prepare(`
    SELECT * FROM market_orders WHERE project_id = ? AND status = 'pending_board' AND buyer_id IS NOT NULL
    ORDER BY created_at ASC
  `).bind(project_id).all()

  const matched: number[] = []
  
  // FIFO matching
  for (const sell of sellOrders.results as any[]) {
    for (const buy of buyOrders.results as any[]) {
      if (buy.shares_count === sell.shares_count) {
        // Match at AI fundamental price
        await c.env.DB.prepare(`
          UPDATE market_orders SET status = 'completed', completed_at = CURRENT_TIMESTAMP, bid_price = ?, fundamental_price = ? WHERE id = ?
        `).bind(aiPrice, aiPrice, sell.id).run()

        await logAudit(c.env.DB, 'market_order_matched', 'market_order', sell.id, null,
          JSON.stringify({ buyer: buy.buyer_id, seller: sell.seller_id, price: aiPrice, shares: sell.shares_count }))
        
        matched.push(sell.id)
        break
      }
    }
  }

  return c.json({
    success: true,
    matched_count: matched.length,
    order_ids: matched,
    ai_price: aiPrice,
    price_band: { low: Math.round(priceLow * 100) / 100, high: Math.round(priceHigh * 100) / 100 },
    matching_rule: 'FIFO (first-in-first-out) at AI fundamental price',
    reference: 'Part XI.3 — Trading Rules Under Fundamental Pricing'
  })
})

// =========================================================================
// Block Trade (>5% of shares) with ±10% negotiation (Part XI.3)
// =========================================================================

marketRoutes.post('/block-trade', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, shares_count, negotiated_price, reason } = await c.req.json()

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const totalShares = project.total_shares || 10000
  const blockThreshold = totalShares * 0.05

  if (shares_count < blockThreshold) {
    return c.json({ error: `Block trade requires >5% of total shares (${blockThreshold}). Use normal sell order instead.` }, 400)
  }

  // Verify ±10% of AI price
  const aiPrice = project.fundamental_share_price
  if (!aiPrice) return c.json({ error: 'No fundamental price set' }, 400)

  const minPrice = aiPrice * 0.9
  const maxPrice = aiPrice * 1.1

  if (negotiated_price < minPrice || negotiated_price > maxPrice) {
    return c.json({ error: `Block trade price must be within ±10% of AI price (${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} EGP)` }, 400)
  }

  // Verify shareholding
  const shareholding = await c.env.DB.prepare(`
    SELECT * FROM shareholdings WHERE project_id = ? AND user_id = ? AND status = 'active'
  `).bind(project_id, payload.uid).first<any>()

  if (!shareholding || shareholding.shares_count < shares_count) {
    return c.json({ error: 'Insufficient shares' }, 400)
  }

  const equityPercent = (shares_count / shareholding.shares_count) * shareholding.equity_percentage
  const result = await c.env.DB.prepare(`
    INSERT INTO market_orders (project_id, seller_id, shares_count, equity_percentage, ask_price, ai_valuation, fundamental_price,
      price_band_low, price_band_high, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_board')
  `).bind(project_id, payload.uid, shares_count, equityPercent, negotiated_price, aiPrice, aiPrice, minPrice, maxPrice).run()

  await logAudit(c.env.DB, 'block_trade_created', 'market_order', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ shares: shares_count, negotiated_price, ai_price: aiPrice, reason, deviation: ((negotiated_price / aiPrice - 1) * 100).toFixed(1) + '%' }))

  return c.json({
    success: true,
    order_id: result.meta.last_row_id,
    shares_count,
    negotiated_price,
    ai_price: aiPrice,
    deviation: ((negotiated_price / aiPrice - 1) * 100).toFixed(1) + '%',
    requires_law_firm_notarization: true,
    reason_logged: reason,
    message: 'Block trade created. Requires law firm notarization with documented reason.',
    reference: 'Part XI.3 — Block Trade Exceptions (±10% for >5% transfers)'
  })
})

// =========================================================================
// Liquidity Reserve Backstop (Part XI.3)
// =========================================================================

marketRoutes.get('/liquidity-reserve', async (c) => {
  // Track excess sell orders vs buy orders
  const projectStats = await c.env.DB.prepare(`
    SELECT mo.project_id, p.title, p.fundamental_share_price,
      SUM(CASE WHEN mo.status IN ('listed','priority_window') THEN mo.shares_count ELSE 0 END) as sell_orders,
      SUM(CASE WHEN mo.status = 'pending_board' AND mo.buyer_id IS NOT NULL THEN mo.shares_count ELSE 0 END) as buy_orders
    FROM market_orders mo
    LEFT JOIN projects p ON mo.project_id = p.id
    GROUP BY mo.project_id
  `).all()

  // 0.1% of all primary fundraising cash fees = liquidity reserve
  const totalFees = await c.env.DB.prepare(`
    SELECT SUM(amount) as total FROM escrow_transactions WHERE transaction_type = 'commission' AND status = 'completed'
  `).first<{total: number}>()

  const reserveBalance = (totalFees?.total || 0) * 0.001 // 0.1% of total commission

  return c.json({
    liquidity_reserve_balance: Math.round(reserveBalance),
    funded_by: '0.1% of all primary fundraising cash fees',
    purpose: 'Backstop for excess sell orders — buys shares when sell > buy for 5 consecutive days',
    project_liquidity: projectStats.results,
    rules: {
      trigger: 'Sell orders exceed buy orders for 5 consecutive days',
      action: 'Reserve buys excess shares at AI fundamental price',
      hold: 'Reserve holds until buy orders return, sells at current AI price',
      principle: 'Never sells at a loss — holds until price recovery'
    },
    reference: 'Part XI.3 — Liquidity Guarantee via Platform Backstop'
  })
})

// =========================================================================
// Price Lock (Part XI.3) - 24h price lock when seller places order
// =========================================================================
marketRoutes.post('/price-lock', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { order_id } = await c.req.json()
  if (!order_id) return c.json({ error: 'order_id required' }, 400)

  const { env } = c
  const order = await env.DB.prepare('SELECT * FROM market_orders WHERE id = ?').bind(order_id).first<any>()
  if (!order) return c.json({ error: 'Order not found' }, 404)

  const project = await env.DB.prepare('SELECT fundamental_share_price FROM projects WHERE id = ?').bind(order.project_id).first<any>()
  const lockedPrice = project?.fundamental_share_price || order.ask_price

  const lockEnd = new Date()
  lockEnd.setHours(lockEnd.getHours() + 24)

  await env.DB.prepare(`
    INSERT INTO price_locks (project_id, order_id, locked_price, lock_end) VALUES (?, ?, ?, ?)
  `).bind(order.project_id, order_id, lockedPrice, lockEnd.toISOString()).run()

  return c.json({
    order_id,
    locked_price: lockedPrice,
    lock_start: new Date().toISOString(),
    lock_end: lockEnd.toISOString(),
    note: 'If new AI price published during lock, order auto-adjusts or can be cancelled and re-placed',
    blueprint_reference: 'Part XI.3 - Price Lock'
  })
})

// =========================================================================
// Price Bands (Part XI.3) - ±5% standard, ±10% exceptional news
// =========================================================================
marketRoutes.get('/price-bands/:projectId', async (c) => {
  const projectId = c.req.param('projectId')
  const { env } = c

  const project = await env.DB.prepare('SELECT id, title, fundamental_share_price, health_score FROM projects WHERE id = ?').bind(projectId).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const price = project.fundamental_share_price || 0
  const exceptionalNews = project.health_score < 30 || project.health_score > 95

  const bandWidth = exceptionalNews ? 0.10 : 0.05
  const bandLow = Math.round(price * (1 - bandWidth) * 100) / 100
  const bandHigh = Math.round(price * (1 + bandWidth) * 100) / 100

  return c.json({
    project_id: parseInt(projectId),
    project_name: project.title,
    ai_fundamental_price: price,
    price_band: {
      low: bandLow,
      high: bandHigh,
      width: `±${bandWidth * 100}%`,
      exceptional_news_detected: exceptionalNews,
      note: exceptionalNews ? 'Band expanded to ±10% due to exceptional conditions, resets after 7 days' : 'Standard ±5% sentiment band'
    },
    trading_rule: 'All trades must execute within this price band. No bidding or negotiation.',
    blueprint_reference: 'Part XI.3 - Price Bands'
  })
})

// =========================================================================
// Liquidity Backstop Auto-Buy (Part XI.3)
// =========================================================================
marketRoutes.post('/backstop-buy', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id } = await c.req.json()
  if (!project_id) return c.json({ error: 'project_id required' }, 400)

  const { env } = c

  // Check liquidity reserve
  let reserve = await env.DB.prepare('SELECT * FROM liquidity_reserve WHERE project_id = ?').bind(project_id).first<any>()
  if (!reserve) {
    await env.DB.prepare('INSERT INTO liquidity_reserve (project_id, reserve_balance) VALUES (?, 0)').bind(project_id).run()
    reserve = { reserve_balance: 0, consecutive_sell_days: 0, backstop_active: 0 }
  }

  // Check consecutive sell > buy days
  const sellOrders = await env.DB.prepare("SELECT COUNT(*) as count FROM market_orders WHERE project_id = ? AND status IN ('listed','priority_window')").bind(project_id).first<any>()
  const buyOrders = await env.DB.prepare("SELECT COUNT(*) as count FROM market_orders WHERE project_id = ? AND buyer_id IS NOT NULL AND status = 'pending_board'").bind(project_id).first<any>()

  const sellExceeds = (sellOrders?.count || 0) > (buyOrders?.count || 0)
  const newConsecutiveDays = sellExceeds ? (reserve.consecutive_sell_days || 0) + 1 : 0
  const shouldActivate = newConsecutiveDays >= 5

  await env.DB.prepare('UPDATE liquidity_reserve SET consecutive_sell_days = ?, backstop_active = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
    .bind(newConsecutiveDays, shouldActivate ? 1 : 0, project_id).run()

  if (shouldActivate) {
    const project = await env.DB.prepare('SELECT fundamental_share_price FROM projects WHERE id = ?').bind(project_id).first<any>()
    const price = project?.fundamental_share_price || 0

    return c.json({
      project_id,
      backstop_triggered: true,
      consecutive_sell_days: newConsecutiveDays,
      action: 'Reserve buying excess shares at AI fundamental price',
      buy_price: price,
      reserve_balance: reserve.reserve_balance,
      rule: 'Reserve holds shares until buy orders return; never sells at a loss',
      blueprint_reference: 'Part XI.3 - Liquidity Guarantee via Platform Backstop'
    })
  }

  return c.json({
    project_id,
    backstop_triggered: false,
    consecutive_sell_days: newConsecutiveDays,
    days_until_trigger: Math.max(0, 5 - newConsecutiveDays),
    sell_orders: sellOrders?.count || 0,
    buy_orders: buyOrders?.count || 0
  })
})

// =========================================================================
// Soft Pledges (Part VII.1) - Interest Phase non-binding pledges
// =========================================================================
marketRoutes.post('/soft-pledge', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id, pledge_amount } = await c.req.json()
  if (!project_id || !pledge_amount) return c.json({ error: 'project_id and pledge_amount required' }, 400)

  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)
  if (project.status !== 'interest_phase') return c.json({ error: 'Project not in interest phase' }, 400)

  // Diversification limit: no single pledge > 20% of goal (Part VII.1)
  if (pledge_amount > project.funding_goal * 0.20) {
    return c.json({ error: 'Single pledge cannot exceed 20% of funding goal (anti-concentration)', max_allowed: project.funding_goal * 0.20 }, 400)
  }

  // Get investor reputation for credibility weight
  const investor = await env.DB.prepare('SELECT reputation_score FROM users WHERE id = ?').bind(auth.uid).first<any>()
  const credibilityWeight = (investor?.reputation_score || 50) / 100

  await env.DB.prepare(`
    INSERT INTO soft_pledges (project_id, investor_id, pledge_amount, credibility_weight) VALUES (?, ?, ?, ?)
  `).bind(project_id, auth.uid, pledge_amount, credibilityWeight).run()

  // Update project soft pledge total
  const totalPledges = await env.DB.prepare('SELECT SUM(pledge_amount * credibility_weight) as weighted FROM soft_pledges WHERE project_id = ? AND status = ?').bind(project_id, 'active').first<any>()
  const totalVotes = await env.DB.prepare("SELECT COUNT(*) as count FROM soft_pledges WHERE project_id = ? AND status = 'active'").bind(project_id).first<any>()

  await env.DB.prepare('UPDATE projects SET soft_pledges = ?, interest_votes = ? WHERE id = ?')
    .bind(totalPledges?.weighted || 0, totalVotes?.count || 0, project_id).run()

  // Check thresholds
  const thresholdMet = (totalPledges?.weighted || 0) >= project.funding_goal * 0.30 || (totalVotes?.count || 0) >= 500

  return c.json({
    project_id,
    pledge_amount,
    credibility_weight: Math.round(credibilityWeight * 100) / 100,
    weighted_pledge: Math.round(pledge_amount * credibilityWeight),
    total_pledges_weighted: Math.round(totalPledges?.weighted || 0),
    total_interest_votes: totalVotes?.count || 0,
    threshold_met: thresholdMet,
    threshold_rules: {
      pledge_threshold: '30% of funding goal (credibility-weighted)',
      vote_threshold: '500 distinct interested votes',
      current_vs_goal: `${Math.round(((totalPledges?.weighted || 0) / project.funding_goal) * 100)}%`
    },
    priority_allocation: 'Pledgers get 48-hour exclusive window when live round opens',
    blueprint_reference: 'Part VII.1 - Investor Interest Phase'
  })
})

// =========================================================================
// Reservation System (Part VII.2) - 48h reservation with extension
// =========================================================================
marketRoutes.post('/reserve', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id, shares_count, amount } = await c.req.json()
  if (!project_id || !amount) return c.json({ error: 'project_id and amount required' }, 400)

  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project || project.status !== 'live_fundraising') return c.json({ error: 'Project not in live fundraising' }, 400)

  // Check investor cap
  if (project.investor_cap_type === 'limited') {
    const currentInvestors = await env.DB.prepare("SELECT COUNT(DISTINCT investor_id) as count FROM reservations WHERE project_id = ? AND status IN ('reserved','extended','paid')").bind(project_id).first<any>()
    if ((currentInvestors?.count || 0) >= (project.investor_cap || 999999)) {
      return c.json({ error: 'Investor cap reached', max_investors: project.investor_cap }, 400)
    }
  }

  // Check minimum investment
  const minInvestment = project.ai_min_investment || project.min_investment || 50
  if (amount < minInvestment) {
    return c.json({ error: `Minimum investment is ${minInvestment} EGP`, min_investment: minInvestment }, 400)
  }

  // Check failure count (Part VII.2 - penalty for >2 abandonments in 12 months)
  const failures = await env.DB.prepare("SELECT COUNT(*) as count FROM reservations WHERE investor_id = ? AND status IN ('cancelled','expired') AND created_at > datetime('now', '-12 months')").bind(auth.uid).first<any>()
  if ((failures?.count || 0) >= 2) {
    return c.json({ error: 'Temporary ban: more than 2 abandoned reservations in 12 months. 30-day cooling period applied.', ban_days: 30 }, 403)
  }

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 48)

  await env.DB.prepare(`
    INSERT INTO reservations (project_id, investor_id, shares_count, amount, expires_at) VALUES (?, ?, ?, ?, ?)
  `).bind(project_id, auth.uid, shares_count || Math.floor(amount / (project.fundamental_share_price || 1)), amount, expiresAt.toISOString()).run()

  return c.json({
    project_id,
    amount,
    shares_reserved: shares_count || Math.floor(amount / (project.fundamental_share_price || 1)),
    expires_at: expiresAt.toISOString(),
    extension_available: true,
    extension_note: 'One 48-hour extension allowed upon request',
    payment_instructions: 'Transfer to law firm escrow account with unique reference code',
    min_investment: minInvestment,
    blueprint_reference: 'Part VII.2 - Reservation System'
  })
})

// POST /reserve/:id/extend - Extend reservation by 48h
marketRoutes.post('/reserve/:id/extend', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const { env } = c
  const reservation = await env.DB.prepare('SELECT * FROM reservations WHERE id = ? AND investor_id = ?').bind(id, auth.uid).first<any>()
  if (!reservation) return c.json({ error: 'Reservation not found' }, 404)
  if (reservation.extension_used) return c.json({ error: 'Extension already used. Only one 48-hour extension allowed.' }, 400)

  const newExpiry = new Date(reservation.expires_at)
  newExpiry.setHours(newExpiry.getHours() + 48)

  await env.DB.prepare('UPDATE reservations SET status = ?, expires_at = ?, extension_used = 1 WHERE id = ?')
    .bind('extended', newExpiry.toISOString(), id).run()

  return c.json({
    reservation_id: parseInt(id),
    new_expires_at: newExpiry.toISOString(),
    extension_used: true,
    note: 'No further extensions available. Transfer funds before expiry.',
    blueprint_reference: 'Part VII.2 - Reservation Extension'
  })
})
