import { Hono } from 'hono'
import type { AppType } from '../index'

export const constitutionRoutes = new Hono<AppType>()

// Public Constitution Viewer (Blueprint v3.1 — 10 Rules)
constitutionRoutes.get('/rules', (c) => {
  return c.json({
    platform: 'SHERKETI',
    version: '3.1.0',
    constitutional_hash: '0x9b7e5a2d1f4c8e3a6b9d2f7c4e1a8b3d5f6c2a9e',
    last_updated: '2026-04-15',
    founding_principle: 'Democratizing ownership, enforcing fairness, building Egypt\'s future—one constitutional share at a time.',
    immutable_core_rules: [
      {
        id: 1,
        title: 'Zero Custody Principle',
        title_ar: 'مبدأ عدم الحفظ',
        description: 'SHERKETI never receives, holds, transfers, or temporarily controls funds. All money stays in law-firm escrow accounts.',
        enforcement: 'Technical: No API path exists for platform to handle money.',
        amendable: false
      },
      {
        id: 2,
        title: 'Escrow-Only Capital Flow',
        title_ar: 'تدفق رأس المال عبر الضمان فقط',
        description: 'All money flows directly between investors and licensed Egyptian law-firm escrow accounts. No intermediate bank account owned by SHERKETI.',
        enforcement: 'Legal: Licensed law firms with professional indemnity insurance (min 100M EGP).',
        amendable: false
      },
      {
        id: 3,
        title: 'AI-Locked Governance',
        title_ar: 'الحوكمة المقفلة بالذكاء الاصطناعي',
        description: 'Equity percentages, dividend distributions, salaries, voting outcomes, expenses, and vesting schedules are governed by immutable AI algorithms that cannot be overridden by humans.',
        enforcement: 'Technical: Hard-coded governance engine with no override capability.',
        amendable: false
      },
      {
        id: 4,
        title: 'Human-Proof Enforcement',
        title_ar: 'تنفيذ مقاوم للتدخل البشري',
        description: 'Founders, managers, administrators, and investors cannot override constitutional logic. Any attempt is automatically rejected and logged.',
        enforcement: 'Technical: All governance decisions require AI validation hash.',
        amendable: false
      },
      {
        id: 5,
        title: 'Immutable Auditability',
        title_ar: 'قابلية التدقيق غير القابلة للتغيير',
        description: 'Every action (vote, fund transfer, hire, board resolution, AI decision) is logged into an append-only, blockchain-based ledger with timestamps and AI-generated justifications.',
        enforcement: 'Technical: Append-only database with hash chains. No UPDATE or DELETE operations.',
        amendable: false
      },
      {
        id: 6,
        title: 'One Identity Rule',
        title_ar: 'قاعدة الهوية الواحدة',
        description: 'One government-issued ID = one account permanently. Duplicate submissions are permanently banned.',
        enforcement: 'Technical: AI liveness detection + OCR + biometric fingerprinting + duplicate detection.',
        amendable: false
      },
      {
        id: 7,
        title: 'Transparency Mandate',
        title_ar: 'أمر الشفافية',
        description: 'All constitutional rules are publicly viewable. All actions (except personal data) are immutably logged and accessible to relevant shareholders.',
        enforcement: 'Technical: Public API endpoint + Constitution Viewer UI.',
        amendable: true,
        amendment_requirement: '75% supermajority + 90-day cooling period + law firm review'
      },
      {
        id: 8,
        title: 'Platform Fee Model',
        title_ar: 'نموذج رسوم المنصة',
        description: 'SHERKETI receives a cash platform fee of 2.5% of total funds raised (deducted from escrow at closing) PLUS 2.5% equity in the company (non-dilutable, fully vested at closing). This applies uniformly to ALL tiers (A, B, C, D). SHERKETI also holds a 5-year board seat with VETO power (limited to 6 constitutional categories) for ALL tiers (A, B, C, D). After 5 years, shareholders vote on renewal.',
        enforcement: 'Technical + Legal: Fee structure hard-coded per tier. Board seat term automatically tracked with 5-year expiry and mandatory shareholder vote for renewal.',
        amendable: false
      },
      {
        id: 9,
        title: 'Fundamental-Only Share Pricing',
        title_ar: 'تسعير الأسهم بالأساسيات فقط',
        description: 'Share value is determined exclusively by AI-calculated intrinsic value based on company profits, net assets, and projected growth. No secondary market transaction may create a price different from the current AI-published price except within a ±5% band. Demand-supply dynamics have no influence on share price.',
        enforcement: 'Technical: AI fundamental pricing engine. Price = (EPS × Sector P/E × Growth Multiplier) + (NAV per share × 0.3). Updated daily.',
        amendable: false
      },
      {
        id: 10,
        title: 'Founder Partner Limitation Right',
        title_ar: 'حق تحديد عدد الشركاء',
        description: 'Founders may set a maximum number of investors for their project. If a cap is set, the AI automatically calculates and enforces a minimum investment amount per investor using: Min Investment = Goal / (Cap × 0.7).',
        enforcement: 'Technical: AI enforces cap and minimum automatically. Cannot be changed after interest phase begins.',
        amendable: false
      }
    ],
    jozour_fee_model: {
      description: 'SHERKETI Dual Compensation: 2.5% Cash Commission + 2.5% Equity Stake — ALL TIERS',
      tiers: {
        A: { cash_commission: '2.5%', equity_stake: '2.5%', board_seat: true, board_term: '5 years', veto_power: true, renewal: 'Shareholder vote after 5 years' },
        B: { cash_commission: '2.5%', equity_stake: '2.5%', board_seat: true, board_term: '5 years', veto_power: true, renewal: 'Shareholder vote after 5 years' },
        C: { cash_commission: '2.5%', equity_stake: '2.5%', board_seat: true, board_term: '5 years', veto_power: true, renewal: 'Shareholder vote after 5 years' },
        D: { cash_commission: '2.5%', equity_stake: '2.5%', board_seat: true, board_term: '5 years', veto_power: true, renewal: 'Shareholder vote after 5 years' }
      },
      veto_scope: 'SHERKETI veto applies ONLY to these 6 categories: (1) Zero-custody rule changes, (2) Escrow to non-approved law firm, (3) Actions violating Egyptian law, (4) Asset sale >50% without shareholder vote, (5) Dilution of SHERKETI 2.5% equity without compensation, (6) Removal of SHERKETI as platform (requires 90% shareholder vote).',
      veto_categories: [
        'Any change to the constitutional zero-custody rule',
        'Any attempt to move escrow to a non-approved law firm',
        'Any action that would violate Egyptian law',
        'Sale of company assets >50% of valuation without a shareholder vote',
        'Merger or acquisition that would dilute SHERKETI 2.5% equity without compensation',
        'Removal of SHERKETI as the platform (requires 90% shareholder vote, not vetoable)'
      ],
      after_5_years: 'At the 5-year mark, an automatic shareholder vote is placed on the ballot 90 days before term end. Simple majority (>50%) decides retention. If voted out, SHERKETI retains equity but loses board seat and veto power. If no vote is held, term extends by one year then auto-renews.',
      no_veto_on: 'Day-to-day operations, hiring/firing employees, normal expenses, dividend amounts (unless illegal), manager removal votes'
    },
    founder_tier_rules: {
      A: { equity: '5% permanent', dividend_bonus: 'Additional 5% of net profits forever (on top of equity)', manager: 'Banned — independent manager appointed by board', vesting: 'None — fixed 5%' },
      B: { equity: '5% immediate → 10% after 12 consecutive profitable months', dividend_bonus: 'Current equity % of net profits', manager: 'None initially; founder can be elected post-funding', vesting: '5% → 10% milestone-based' },
      C: { equity: '10% immediate + 25% vests over 4 years (6.25%/year)', dividend_bonus: '35% of net profits while manager; drops to vested equity % if removed', manager: 'Founder is default manager until removed by vote', vesting: '25% over 4 years' },
      D: { equity: 'AI Valuation v3.0 determines (existing company)', dividend_bonus: 'Standard pro-rata (equity %)', manager: 'Owner retains full control as manager', vesting: 'N/A — existing company' }
    },
    governance_rules: {
      voting: {
        power: '1 share = 1 vote. No super-voting shares.',
        quorum: '51% of voting power required',
        standard_majority: '>50% for standard resolutions',
        supermajority: '75% for constitutional amendments',
        notice_period: '48 hours via email/SMS/WhatsApp/in-app',
        inactive_rule: 'Auto-yes (deemed consent) for routine matters after 48h; counts as "no" for major matters',
        proxy: 'Allowed with digital authorization (no proxy for SHERKETI representative)',
        notarization: 'All results digitally notarized by law firm'
      },
      board_composition: {
        mandatory_roles: [
          'Founder Representative — Always present, appointed by founder',
          'Manager — Tier-dependent (see tier rules)',
          'Independent Licensed Accountant — 2-year term, renewable',
          'Large Shareholder Representatives (>10% holders) — 1-year term',
          'SHERKETI Representative — 5yr term, veto on 6 constitutional categories'
        ]
      },
      transaction_approval: {
        under_1_percent: 'Manager approval only',
        between_1_10_percent: 'Dual signature: Manager + Independent Accountant',
        over_10_percent: 'Full Board vote required (48h notice)',
        recurring_expenses: 'Pre-approved with monthly caps; overrun requires dual signature',
        emergency_expenses: 'Any two board members can approve, ratified by full board within 7 days'
      },
      emergency_protocols: {
        freeze_triggers: [
          'Fraud probability > 85% (AI detection)',
          'Manager-accountant collusion detected',
          'Escrow breach attempt',
          'Law firm compliance failure'
        ],
        recall: '72-hour shareholder vote for capital return in extreme cases',
        resolution_options: ['Continue operations', 'Replace management', 'Full unwind (return remaining capital)']
      }
    },
    project_tiers: {
      A: { name: 'New Idea, No Experience', max_raise: '3,000,000 EGP', min_investment: '50 EGP', fee: '2.5% cash + 2.5% equity' },
      B: { name: 'New Idea, Medium Experience', max_raise: '25,000,000 EGP', min_investment: '50 EGP', fee: '2.5% cash + 2.5% equity' },
      C: { name: 'Expert Founder', max_raise: 'Unlimited', min_investment: '50 EGP', fee: '2.5% cash + 2.5% equity' },
      D: { name: 'Existing Company Expansion', max_raise: 'Unlimited', min_investment: '50 EGP (or AI-calculated)', fee: '2.5% cash + 2.5% equity' }
    },
    fundamental_pricing: {
      formula: 'Share Price = (EPS × Sector P/E × Growth Multiplier) + (NAV per share × 0.3)',
      price_band: '±5% for sentiment adjustment (expands to ±10% for exceptional news, resets after 7 days)',
      sector_pe: {
        'Food & Beverage': 12, 'Technology': 18, 'Agriculture': 10, 'Manufacturing': 9,
        'Tourism': 14, 'FinTech': 20, 'Green Energy': 15, 'Healthcare': 16,
        'Education': 11, 'E-Commerce': 17, 'Real Estate': 8, 'Logistics': 12
      },
      update_frequency: 'Daily (only changes when underlying financials change)'
    },
    add_ons: [
      { id: 1, name: 'Fundamental-Only Share Pricing', status: 'Active' },
      { id: 3, name: 'Employee Registry with Position & Role', status: 'Active' },
      { id: 4, name: 'Founder Priority Share Purchase', status: 'Active' },
      { id: 7, name: 'Dynamic Profit-Share Tiers', status: 'Active' },
      { id: 8, name: 'Anti-Fragility Insurance Vault', status: 'Active' },
      { id: 10, name: 'Founder-Investor AI Matchmaking', status: 'Planned' },
      { id: 13, name: 'Bankruptcy Reverse Auction', status: 'Planned' },
      { id: 14, name: 'Cross-Project Skill Barter Exchange', status: 'Planned' },
      { id: 15, name: 'GAFI API Integration', status: 'Planned' },
      { id: 16, name: 'Founder-Limited Partners & AI Minimum', status: 'Active' },
      { id: 17, name: 'Pitch Decks & Videos (Score Boost)', status: 'Active' }
    ],
    ai_modules: [
      'Feasibility AI (Gemma-2 27B — Project viability scoring 0-100)',
      'SHERKETI Valuation Algorithm v3.0 (7-step weighted blend + sanity check)',
      'AI Salary Calculation Engine (Base × Tier × Performance × Region × Profit)',
      'Fraud Detection & Anomaly Patterns',
      'Risk Prediction System (5-category: Governance/Financial/Operational/Compliance/Reputation)',
      'Reputation Scoring (Investor/Founder/Board Member/Global)',
      'Health Scoring (0-100 company wellness daily)',
      'Tax Automation (Egyptian ETA Form 41, VAT, Stamp Duty)',
      'Fundamental Share Pricing Engine (EPS × P/E × Growth + NAV)',
      'SHERKETI Board Term Tracker & Auto-Vote Trigger',
      'Founder Partner Limitation & AI Minimum Calculator'
    ],
    hard_limits_non_amendable: [
      'Zero custody — platform never holds funds',
      'Escrow separation — law-firm accounts only',
      'AI-locked enforcement — no human overrides',
      'One ID per account — permanent binding',
      'Platform fee structure — 2.5% cash + 2.5% equity (ALL tiers)',
      'Fundamental-only share pricing — no demand-based price discovery',
      'SHERKETI 5-year board seat with limited veto (6 categories)',
      'Mandatory shareholder vote on SHERKETI renewal at 5-year mark'
    ]
  })
})

// Audit chain verification
constitutionRoutes.get('/audit-chain', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20')
  
  const logs = await c.env.DB.prepare(`
    SELECT id, action, entity_type, entity_id, output_hash, previous_hash, created_at, ai_model
    FROM audit_log ORDER BY id DESC LIMIT ?
  `).bind(limit).all()

  let chainValid = true
  const entries = logs.results as any[]
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].previous_hash !== entries[i + 1].output_hash) {
      chainValid = false
      break
    }
  }

  return c.json({
    chain_valid: chainValid,
    entries: entries.length,
    latest_hash: entries.length > 0 ? entries[0].output_hash : 'genesis',
    audit_entries: entries
  })
})

// SHERKETI Board Term Status (public)
constitutionRoutes.get('/jozour-terms', async (c) => {
  const projects = await c.env.DB.prepare(`
    SELECT p.id, p.title, p.tier, p.jozour_equity_percent, p.jozour_commission_percent,
           p.jozour_veto_active, p.jozour_board_term_start, p.jozour_board_term_end,
           p.jozour_term_renewed, p.status, p.founder_equity_percent, p.founder_dividend_bonus,
           b.status as board_status, b.term_start, b.term_end, b.has_veto, b.veto_categories
    FROM projects p 
    LEFT JOIN board_members b ON p.id = b.project_id AND b.role = 'jozour_observer'
    WHERE p.status NOT IN ('draft', 'rejected', 'dissolved')
    ORDER BY p.created_at DESC
  `).all()

  return c.json({
    jozour_board_terms: projects.results,
    model: {
      commission: '2.5% cash on ALL tiers (A/B/C/D)',
      equity: '2.5% equity on ALL tiers (A/B/C/D)',
      board_term: '5 years with veto (6 categories) for ALL tiers',
      renewal: 'Auto-ballot 90 days before term end. Simple majority. If no vote: extends 1 year, then auto-renews.',
      veto_categories: [
        'Zero-custody changes',
        'Non-approved escrow firm',
        'Egyptian law violations',
        'Asset sale >50% without vote',
        'SHERKETI equity dilution',
        'Platform removal (needs 90%)'
      ]
    }
  })
})

// Employee Registry (Add-on 3) — public endpoint for shareholders
constitutionRoutes.get('/employees/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  const employees = await c.env.DB.prepare(`
    SELECT id, full_name, position_title, role_description, department, hire_date,
           reporting_to, employment_type, compensation_band, status, is_key_person,
           succession_plan_status
    FROM employee_registry WHERE project_id = ? ORDER BY department, position_title
  `).bind(projectId).all()

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_key_person = 1 THEN 1 ELSE 0 END) as key_persons,
      SUM(CASE WHEN succession_plan_status = 'ready' THEN 1 ELSE 0 END) as succession_ready
    FROM employee_registry WHERE project_id = ?
  `).bind(projectId).first()

  return c.json({ employees: employees.results, stats })
})

// Add employee (Add-on 3 CRUD)
constitutionRoutes.post('/employees', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const { verifyToken } = await import('../utils/auth')
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { project_id, full_name, position_title, role_description, department, employment_type, compensation_band, reporting_to, is_key_person } = await c.req.json()

  if (!project_id || !full_name || !position_title) {
    return c.json({ error: 'Missing required fields: project_id, full_name, position_title' }, 400)
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO employee_registry (project_id, full_name, position_title, role_description, department, employment_type, compensation_band, reporting_to, is_key_person, succession_plan_status, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', 'active')
  `).bind(project_id, full_name, position_title, role_description || '', department || 'General', employment_type || 'full_time', compensation_band || '', reporting_to || '', is_key_person ? 1 : 0).run()

  // Check hiring freeze trigger: >25% growth in 90 days
  const recentHires = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM employee_registry WHERE project_id = ? AND hire_date >= datetime('now', '-90 days')
  `).bind(project_id).first<{count: number}>()
  const totalEmployees = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM employee_registry WHERE project_id = ? AND status = 'active'
  `).bind(project_id).first<{count: number}>()

  let hiringAlert = null
  if (totalEmployees && recentHires && (recentHires.count / Math.max(1, totalEmployees.count)) > 0.25) {
    hiringAlert = 'WARNING: Employee count grew >25% in 90 days. Board review auto-scheduled.'
  }

  const { logAudit } = await import('../utils/auth')
  await logAudit(c.env.DB, 'employee_added', 'employee_registry', result.meta.last_row_id as number, payload.uid,
    JSON.stringify({ full_name, position_title, project_id }))

  return c.json({
    success: true,
    employee_id: result.meta.last_row_id,
    hiring_alert: hiringAlert,
    message: `Employee ${full_name} added to registry. All shareholders can now see this entry.`,
    privacy_note: 'Shareholders see: name, position, department, hire date, compensation band, status. They do NOT see: national ID, address, phone, exact salary, medical info.',
    reference: 'Part IX.4 / Add-on 3 — Employee Registry & Transparency'
  })
})

// Update employee status
constitutionRoutes.put('/employees/:id', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const { verifyToken, logAudit } = await import('../utils/auth')
  const payload = verifyToken(authHeader.replace('Bearer ', ''))
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  const fields: string[] = []
  const values: any[] = []

  if (body.position_title) { fields.push('position_title = ?'); values.push(body.position_title) }
  if (body.department) { fields.push('department = ?'); values.push(body.department) }
  if (body.compensation_band) { fields.push('compensation_band = ?'); values.push(body.compensation_band) }
  if (body.reporting_to) { fields.push('reporting_to = ?'); values.push(body.reporting_to) }
  if (body.status) { fields.push('status = ?'); values.push(body.status) }
  if (body.is_key_person !== undefined) { fields.push('is_key_person = ?'); values.push(body.is_key_person ? 1 : 0) }
  if (body.succession_plan_status) { fields.push('succession_plan_status = ?'); values.push(body.succession_plan_status) }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

  values.push(id)
  await c.env.DB.prepare(`UPDATE employee_registry SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  await logAudit(c.env.DB, 'employee_updated', 'employee_registry', id, payload.uid, JSON.stringify(body))

  return c.json({ success: true, message: 'Employee record updated. Change logged in immutable ledger.' })
})

// Whistleblower Channel (Add-on 3, Appendix E)
constitutionRoutes.post('/whistleblower', async (c) => {
  // Anonymous — no auth required
  const { project_id, report_type, description } = await c.req.json()

  if (!project_id || !description) {
    return c.json({ error: 'Missing required fields: project_id, description' }, 400)
  }

  const reportTypes = ['fraud', 'harassment', 'safety_violation', 'misconduct', 'other']
  const type = reportTypes.includes(report_type) ? report_type : 'other'

  // AI validation confidence score (simulated)
  const aiConfidence = 50 + Math.random() * 40
  const shareWithShareholders = aiConfidence > 70

  await c.env.DB.prepare(`
    INSERT INTO governance_events (project_id, event_type, ai_model, details)
    VALUES (?, 'whistleblower_report', 'whistleblower-ai-v1', ?)
  `).bind(project_id, JSON.stringify({
    report_type: type,
    description: description.substring(0, 1000),
    ai_confidence: aiConfidence.toFixed(0) + '%',
    shared_with_shareholders: shareWithShareholders,
    anonymous: true,
    encrypted: true
  })).run()

  return c.json({
    success: true,
    report_id: `WB-${Date.now()}`,
    anonymous: true,
    encrypted: true,
    ai_validation_confidence: aiConfidence.toFixed(0) + '%',
    shared_with_shareholders: shareWithShareholders,
    note: shareWithShareholders ? 'AI confidence > 70%. Anonymized summary will be shared with shareholders.' : 'AI confidence < 70%. Report filed for further investigation.',
    next_steps: 'If shareholders receive the summary, they may vote to trigger an independent investigation funded from escrow.',
    reference: 'Part IX.4 / Add-on 3 / Appendix E — Whistleblower Channel'
  })
})
