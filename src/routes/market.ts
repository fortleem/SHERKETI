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
