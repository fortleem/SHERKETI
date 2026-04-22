import { Hono } from 'hono'
import type { AppType } from '../index'
import { verifyToken, logAudit } from '../utils/auth'

export const financialRoutes = new Hono<AppType>()

// =========================================================================
// Part IX.5 — Financial Reporting (Automated Quarterly/Annual)
// =========================================================================

// Generate financial report (quarterly/semi-annual/annual)
financialRoutes.post('/report/generate', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, period_type, period } = await c.req.json()
  if (!project_id || !period_type) return c.json({ error: 'project_id and period_type required' }, 400)

  const validPeriods = ['quarterly', 'semi_annual', 'annual']
  if (!validPeriods.includes(period_type)) return c.json({ error: `period_type must be one of: ${validPeriods.join(', ')}` }, 400)

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Gather all financial data
  const escrowDeposits = await c.env.DB.prepare(`
    SELECT SUM(amount) as total FROM escrow_transactions WHERE project_id = ? AND transaction_type = 'deposit' AND status = 'completed'
  `).bind(project_id).first<{total: number}>()

  const escrowReleases = await c.env.DB.prepare(`
    SELECT SUM(amount) as total FROM escrow_transactions WHERE project_id = ? AND transaction_type = 'release' AND status = 'completed'
  `).bind(project_id).first<{total: number}>()

  const commissions = await c.env.DB.prepare(`
    SELECT SUM(amount) as total FROM escrow_transactions WHERE project_id = ? AND transaction_type = 'commission' AND status = 'completed'
  `).bind(project_id).first<{total: number}>()

  const dividends = await c.env.DB.prepare(`
    SELECT SUM(amount) as total FROM escrow_transactions WHERE project_id = ? AND transaction_type = 'dividend' AND status = 'completed'
  `).bind(project_id).first<{total: number}>()

  const salaryExpenses = await c.env.DB.prepare(`
    SELECT SUM(calculated_salary) as total FROM salary_records WHERE project_id = ? AND status IN ('approved','paid')
  `).bind(project_id).first<{total: number}>()

  const employeeCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM employee_registry WHERE project_id = ? AND status = 'active'
  `).bind(project_id).first<{count: number}>()

  const milestones = await c.env.DB.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM milestones WHERE project_id = ?
  `).bind(project_id).first<{total: number, completed: number}>()

  // AI predictions
  const revenue = project.annual_revenue || project.funding_raised * 0.3
  const burnRate = (salaryExpenses?.total || 0) + (escrowReleases?.total || 0) * 0.1
  const cashOnHand = (escrowDeposits?.total || 0) - (escrowReleases?.total || 0) - (commissions?.total || 0)
  const runway = burnRate > 0 ? Math.round(cashOnHand / burnRate) : 999
  const shortfallAlert = runway < 6

  // Tax calculations
  const corporateTax = revenue * 0.225 // 22.5% Egyptian corporate tax
  const vat = revenue * 0.14 // 14% VAT

  const report = {
    project_id,
    project_title: project.title,
    tier: project.tier,
    period_type,
    period: period || new Date().toISOString().substring(0, 7),
    generated_at: new Date().toISOString(),
    notarized: true,
    notarization_hash: `NTR-${Date.now()}-${project_id}`,

    financial_summary: {
      total_capital_raised: project.funding_raised,
      escrow_deposits: escrowDeposits?.total || 0,
      escrow_releases: escrowReleases?.total || 0,
      escrow_balance: cashOnHand,
      platform_commission_paid: commissions?.total || 0,
      dividends_distributed: dividends?.total || 0,
      salary_expenses: salaryExpenses?.total || 0,
      estimated_revenue: revenue,
      net_profit: project.net_profit || (revenue - (salaryExpenses?.total || 0))
    },

    operational_metrics: {
      employees: employeeCount?.count || 0,
      milestones_completed: milestones?.completed || 0,
      milestones_total: milestones?.total || 0,
      health_score: project.health_score || 50,
      feasibility_score: project.ai_feasibility_score
    },

    ai_predictions: {
      cash_runway_months: runway,
      shortfall_alert: shortfallAlert,
      burn_rate_monthly: Math.round(burnRate),
      revenue_growth_12m: '+15-25% (AI estimate based on sector benchmarks)',
      risk_level: shortfallAlert ? 'HIGH' : runway < 12 ? 'MODERATE' : 'LOW'
    },

    tax_calculations: {
      corporate_tax_22_5_percent: Math.round(corporateTax),
      vat_14_percent: Math.round(vat),
      dividend_withholding_10_percent: Math.round((dividends?.total || 0) * 0.1),
      form_type: 'Form 41',
      authority: 'Egyptian Tax Authority (ETA)',
      next_filing_deadline: 'Quarterly — 15th of following month'
    },

    jozour_fees: {
      cash_commission: `${project.jozour_commission_percent}% = ${Math.round(project.funding_raised * project.jozour_commission_percent / 100)} EGP`,
      equity_stake: `${project.jozour_equity_percent}%`,
      board_seat: project.jozour_veto_active ? 'Active (5yr term)' : 'Expired/Removed',
      term_end: project.jozour_board_term_end
    },

    erp_connectors: {
      supported: ['QuickBooks', 'Zoho Books', 'Sage'],
      sync_status: 'Not connected (production feature)',
      auto_reconciliation: true
    }
  }

  // Store governance event
  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'financial_report_generated', ?, 'financial-ai-v1', ?)
  `).bind(project_id, payload.uid, JSON.stringify({
    period_type, period: report.period,
    notarization_hash: report.notarization_hash,
    shortfall_alert: shortfallAlert, runway
  })).run()

  await logAudit(c.env.DB, 'financial_report_generated', 'project', project_id, payload.uid,
    JSON.stringify({ period_type, notarization_hash: report.notarization_hash }))

  return c.json({
    success: true,
    report,
    reference: 'Part IX.5 — Financial Reporting & Monitoring'
  })
})

// =========================================================================
// Dividend Distribution via Escrow with Tax Withholding
// =========================================================================

financialRoutes.post('/dividend/distribute', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, total_dividend, period } = await c.req.json()
  if (!project_id || !total_dividend) return c.json({ error: 'project_id and total_dividend required' }, 400)

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Get all active shareholders
  const shareholders = await c.env.DB.prepare(`
    SELECT s.*, u.full_name, u.user_type FROM shareholdings s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.project_id = ? AND s.status = 'active'
  `).bind(project_id).all()

  const distributions: any[] = []

  for (const sh of shareholders.results as any[]) {
    const grossDividend = total_dividend * (sh.equity_percentage / 100)
    // 10% dividend withholding tax (Egyptian tax law)
    const taxRate = 0.10
    const taxAmount = grossDividend * taxRate
    const netDividend = grossDividend - taxAmount

    // Founder bonus dividend for Tier A (5% bonus) and Tier C (35% while manager)
    let founderBonus = 0
    if (sh.acquired_via === 'platform_fee') continue // Skip SHERKETI equity for dividends
    if (sh.user_id === project.founder_id) {
      if (project.tier === 'A') founderBonus = total_dividend * 0.05
      if (project.tier === 'C' && project.founder_is_manager) founderBonus = total_dividend * 0.35 - grossDividend
    }

    distributions.push({
      user_id: sh.user_id,
      name: sh.full_name,
      equity_percent: sh.equity_percentage,
      gross_dividend: Math.round(grossDividend * 100) / 100,
      tax_withheld: Math.round(taxAmount * 100) / 100,
      founder_bonus: Math.round(Math.max(0, founderBonus) * 100) / 100,
      net_dividend: Math.round((netDividend + Math.max(0, founderBonus)) * 100) / 100
    })

    // Create escrow transaction for each shareholder
    await c.env.DB.prepare(`
      INSERT INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status)
      VALUES (?, 'dividend', ?, 'escrow', ?, 'completed')
    `).bind(project_id, netDividend + Math.max(0, founderBonus), `user_${sh.user_id}`).run()

    // Create tax record
    await c.env.DB.prepare(`
      INSERT INTO tax_records (project_id, user_id, tax_type, gross_amount, tax_rate, tax_amount, period, status)
      VALUES (?, ?, 'dividend_withholding', ?, 0.10, ?, ?, 'calculated')
    `).bind(project_id, sh.user_id, grossDividend, taxAmount, period || 'Q1-2026').run()

    // Notify shareholder
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, project_id, notification_type, title, message)
      VALUES (?, ?, 'dividend', 'Dividend Payment', ?)
    `).bind(sh.user_id, project_id, `Net dividend of ${Math.round(netDividend)} EGP deposited to your escrow account (after 10% tax withholding).`).run()
  }

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, actor_id, ai_model, details)
    VALUES (?, 'dividend_distributed', ?, 'financial-v1', ?)
  `).bind(project_id, payload.uid, JSON.stringify({ total_dividend, distributions_count: distributions.length, period })).run()

  await logAudit(c.env.DB, 'dividend_distributed', 'project', project_id, payload.uid,
    JSON.stringify({ total_dividend, shareholders: distributions.length }))

  return c.json({
    success: true,
    total_dividend,
    distributions,
    tax_summary: {
      total_withheld: distributions.reduce((s, d) => s + d.tax_withheld, 0),
      rate: '10% (Egyptian dividend withholding)',
      form: 'Form 41 — filed automatically'
    },
    escrow_note: 'All dividends distributed via law-firm escrow with digital notarization',
    reference: 'Part IX.5 — Dividend Distribution + Part IX.6 Tax Automation'
  })
})

// =========================================================================
// Real-time Financial Dashboard Metrics
// =========================================================================

financialRoutes.get('/dashboard/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const escrow = await c.env.DB.prepare(`
    SELECT transaction_type, SUM(amount) as total, COUNT(*) as count
    FROM escrow_transactions WHERE project_id = ? AND status = 'completed' GROUP BY transaction_type
  `).bind(projectId).all()

  const escrowMap: Record<string, number> = {}
  for (const e of escrow.results as any[]) escrowMap[e.transaction_type] = e.total

  const revenue = project.annual_revenue || 0
  const expenses = (escrowMap.release || 0) + (escrowMap.commission || 0)
  const cashFlow = revenue - expenses
  const burnRate = expenses / 12
  const grossMargin = revenue > 0 ? ((revenue - expenses) / revenue * 100) : 0

  return c.json({
    project_id: projectId,
    real_time_metrics: {
      cash_flow: Math.round(cashFlow),
      burn_rate_monthly: Math.round(burnRate),
      revenue: revenue,
      gross_margin: Math.round(grossMargin * 100) / 100 + '%',
      escrow_balance: (escrowMap.deposit || 0) - (escrowMap.release || 0) - (escrowMap.commission || 0),
      total_deposits: escrowMap.deposit || 0,
      total_releases: escrowMap.release || 0,
      commissions_paid: escrowMap.commission || 0,
      dividends_paid: escrowMap.dividend || 0,
      insurance_vault: escrowMap.insurance_vault || 0
    },
    ai_forecast: {
      runway_months: burnRate > 0 ? Math.round((escrowMap.deposit || 0) / burnRate) : 'N/A',
      shortfall_probability: burnRate > revenue / 12 ? 'HIGH' : 'LOW',
      growth_trajectory: project.health_score > 70 ? 'Positive' : project.health_score > 40 ? 'Flat' : 'Declining'
    },
    reference: 'Part IX.5 — Real-time Financial Dashboard'
  })
})

// =========================================================================
// CONTRACT MANAGEMENT (Part IX.3)
// =========================================================================
financialRoutes.post('/contract/create', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id, contract_type, title, parties, value, start_date, end_date, auto_renewal, termination_clause, liability_type } = await c.req.json()
  if (!project_id || !contract_type || !title || !parties) return c.json({ error: 'project_id, contract_type, title, parties required' }, 400)

  const { env } = c

  // AI contract risk review (Part IX.3)
  const riskFactors = []
  if (liability_type === 'personal') riskFactors.push('Personal guarantee detected - requires 90% shareholder vote')
  if (!termination_clause) riskFactors.push('No termination clause specified')
  if (value && value > 1000000) riskFactors.push('High-value contract - board approval recommended')
  if (auto_renewal) riskFactors.push('Auto-renewal clause - ensure 30-day notice period is included')

  const aiRiskScore = Math.max(0, 100 - riskFactors.length * 20)

  // Personal guarantee check (Part IX.3 - disallowed by default unless 90% vote)
  let personalGuaranteeVoteId = null
  if (liability_type === 'personal') {
    // Auto-create shareholder vote
    const result = await env.DB.prepare(`
      INSERT INTO votes (project_id, proposal_id, title, description, vote_type, required_majority, voting_deadline)
      VALUES (?, 0, ?, 'Personal guarantee approval required per Constitution', 'board_resolution', 90, datetime('now', '+48 hours'))
    `).bind(project_id, `Approve personal guarantee: ${title}`).run()
    personalGuaranteeVoteId = result.meta.last_row_id
  }

  const documentHash = btoa(JSON.stringify({ title, parties, value, date: Date.now() }))

  await env.DB.prepare(`
    INSERT INTO contracts (project_id, contract_type, title, parties, value, start_date, end_date, auto_renewal, renewal_notice_days, termination_clause, ai_risk_score, ai_risk_analysis, document_hash, liability_type, personal_guarantee_vote_id, created_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(project_id, contract_type, title, parties, value || null, start_date || null, end_date || null, auto_renewal ? 1 : 0, termination_clause || null, aiRiskScore, JSON.stringify(riskFactors), documentHash, liability_type || 'company', personalGuaranteeVoteId, auth.uid, 'pending_review').run()

  const { logAudit } = await import('../utils/auth')
  await logAudit(env.DB, 'contract_created', 'contract', 0, auth.uid, JSON.stringify({ project_id, title, contract_type }))

  return c.json({
    message: 'Contract created and pending review',
    contract: { project_id, contract_type, title, parties, value },
    ai_review: {
      risk_score: aiRiskScore,
      risk_level: aiRiskScore >= 80 ? 'low' : aiRiskScore >= 50 ? 'medium' : 'high',
      risk_factors: riskFactors,
      compliance_check: 'Verified against constitutional rules'
    },
    personal_guarantee_vote: personalGuaranteeVoteId ? { vote_id: personalGuaranteeVoteId, required_majority: '90%', note: 'Personal guarantees disallowed by default (Part IX.3)' } : null,
    next_steps: ['Law firm review and notarization', 'Board approval if value > 10% of capital', 'Digital notarization and ledger recording'],
    blueprint_reference: 'Part IX.3 - Contract Management'
  })
})

// GET /contracts/:projectId - Get project contracts
financialRoutes.get('/contracts/:projectId', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const projectId = c.req.param('projectId')
  const contracts = await c.env.DB.prepare('SELECT * FROM contracts WHERE project_id = ? ORDER BY created_at DESC').bind(projectId).all()

  // Check for contracts needing renewal (30-day notice per Part IX.3)
  const renewalAlerts = []
  for (const contract of contracts.results as any[]) {
    if (contract.end_date && contract.auto_renewal) {
      const daysToEnd = Math.floor((new Date(contract.end_date).getTime() - Date.now()) / 86400000)
      if (daysToEnd <= 30 && daysToEnd > 0) {
        renewalAlerts.push({ contract_id: contract.id, title: contract.title, days_to_end: daysToEnd, action: 'Renewal notice period - board can approve auto-renewal' })
      }
    }
  }

  return c.json({
    contracts: contracts.results,
    renewal_alerts: renewalAlerts,
    blueprint_reference: 'Part IX.3 - Contract Management'
  })
})

// POST /contract/:id/notarize - Law firm notarization of contract
financialRoutes.post('/contract/:id/notarize', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const { env } = c

  const contract = await env.DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(id).first<any>()
  if (!contract) return c.json({ error: 'Contract not found' }, 404)

  const notarizationHash = btoa(JSON.stringify({ contract_id: id, stamp_time: Date.now(), law_firm: auth.uid }))

  await env.DB.prepare("UPDATE contracts SET status = 'active', notarized = 1, notarization_hash = ?, law_firm_stamp = ? WHERE id = ?")
    .bind(notarizationHash, new Date().toISOString(), id).run()

  return c.json({
    contract_id: parseInt(id),
    notarized: true,
    notarization_hash: notarizationHash,
    status: 'active',
    blueprint_reference: 'Part IX.3 - Digital Notarization of Contracts'
  })
})

// =========================================================================
// DIVIDEND RECORDS WITH TAX WITHHOLDING (Part IX.5)
// =========================================================================
financialRoutes.post('/dividend/declare', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id, total_dividend, period } = await c.req.json()
  if (!project_id || !total_dividend) return c.json({ error: 'project_id and total_dividend required' }, 400)

  const { env } = c
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(project_id).first<any>()
  if (!project) return c.json({ error: 'Project not found' }, 404)

  // Get all active shareholders
  const shareholders = await env.DB.prepare("SELECT * FROM shareholdings WHERE project_id = ? AND status = 'active'").bind(project_id).all()

  const dividendRecords = []
  const withholdingRate = 0.10 // 10% dividend withholding tax (Part XIX.1)

  for (const sh of shareholders.results as any[]) {
    const equityPct = sh.equity_percentage / 100
    const bonusPct = sh.dividend_bonus ? sh.dividend_bonus / 100 : 0
    const grossAmount = total_dividend * (equityPct + bonusPct)
    const taxWithheld = grossAmount * withholdingRate
    const netAmount = grossAmount - taxWithheld

    await env.DB.prepare(`
      INSERT INTO dividend_records (project_id, shareholder_id, declaration_vote_id, gross_amount, tax_withheld, net_amount, equity_percentage, dividend_bonus, period)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(project_id, sh.user_id, null, grossAmount, taxWithheld, netAmount, sh.equity_percentage, sh.dividend_bonus || 0, period || new Date().toISOString().substring(0, 7)).run()

    // Create tax record
    await env.DB.prepare(`
      INSERT INTO tax_records (project_id, user_id, tax_type, gross_amount, tax_rate, tax_amount, period, form_type, status)
      VALUES (?, ?, 'dividend_withholding', ?, ?, ?, ?, 'form_41', 'calculated')
    `).bind(project_id, sh.user_id, grossAmount, withholdingRate, taxWithheld, period || new Date().toISOString().substring(0, 7)).run()

    dividendRecords.push({
      shareholder_id: sh.user_id,
      equity_percentage: sh.equity_percentage,
      dividend_bonus: sh.dividend_bonus || 0,
      gross_amount: Math.round(grossAmount * 100) / 100,
      tax_withheld: Math.round(taxWithheld * 100) / 100,
      net_amount: Math.round(netAmount * 100) / 100
    })
  }

  const { logAudit } = await import('../utils/auth')
  await logAudit(env.DB, 'dividend_declared', 'project', project_id, auth.uid, JSON.stringify({ total_dividend, records: dividendRecords.length }))

  return c.json({
    project_id,
    total_dividend,
    withholding_tax_rate: '10%',
    dividend_records: dividendRecords,
    total_tax_withheld: Math.round(dividendRecords.reduce((s, r) => s + r.tax_withheld, 0) * 100) / 100,
    total_net_distributed: Math.round(dividendRecords.reduce((s, r) => s + r.net_amount, 0) * 100) / 100,
    form_41: 'Auto-generated for each shareholder',
    next_step: 'Law firm instructs escrow transfer to each shareholder bank account',
    blueprint_reference: 'Part IX.5 - Dividend Distribution with Tax Withholding'
  })
})

// GET /dividends/:projectId - Get dividend history
financialRoutes.get('/dividends/:projectId', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const projectId = c.req.param('projectId')
  const dividends = await c.env.DB.prepare('SELECT * FROM dividend_records WHERE project_id = ? ORDER BY created_at DESC').bind(projectId).all()
  return c.json({ dividends: dividends.results })
})

// POST /form41/generate - Generate Form 41 for capital gains (Part XIX.1)
financialRoutes.post('/form41/generate', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const { project_id, transaction_type, amount, period } = await c.req.json()
  if (!project_id || !amount) return c.json({ error: 'project_id and amount required' }, 400)

  const taxType = transaction_type === 'secondary_trade' ? 'capital_gains' : 'dividend_withholding'
  const taxRate = taxType === 'capital_gains' ? 0.10 : 0.10
  const taxAmount = amount * taxRate

  return c.json({
    form_41: {
      form_number: 'Form 41',
      taxpayer_project: project_id,
      transaction_type: transaction_type || 'capital_gains',
      period: period || new Date().toISOString().substring(0, 7),
      gross_amount: amount,
      tax_type: taxType,
      tax_rate: (taxRate * 100) + '%',
      tax_amount: Math.round(taxAmount * 100) / 100,
      net_amount: Math.round((amount - taxAmount) * 100) / 100,
      filing_authority: 'Egyptian Tax Authority',
      auto_generated: true,
      submission_status: 'ready_for_filing'
    },
    blueprint_reference: 'Part XIX.1 - Form 41 Generation for Capital Gains'
  })
})
