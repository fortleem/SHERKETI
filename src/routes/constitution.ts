import { Hono } from 'hono'
import type { AppType } from '../index'

export const constitutionRoutes = new Hono<AppType>()

// Public Constitution Viewer
constitutionRoutes.get('/rules', (c) => {
  return c.json({
    platform: 'SHERKETI',
    version: '2.0.0',
    last_updated: '2026-04-12',
    immutable_core_rules: [
      {
        id: 1,
        title: 'Zero Custody Principle',
        title_ar: 'مبدأ عدم الحفظ',
        description: 'SHERKETI never receives, holds, transfers, or temporarily controls funds.',
        enforcement: 'Technical: No API path exists for platform to handle money.',
        amendable: false
      },
      {
        id: 2,
        title: 'Escrow-Only Capital Flow',
        title_ar: 'تدفق رأس المال عبر الضمان فقط',
        description: 'All money moves directly between investors and licensed Egyptian law-firm escrow accounts.',
        enforcement: 'Legal: Licensed law firms with professional indemnity insurance.',
        amendable: false
      },
      {
        id: 3,
        title: 'AI-Locked Governance',
        title_ar: 'الحوكمة المقفلة بالذكاء الاصطناعي',
        description: 'Equity, dividends, salaries, voting, expenses, and vesting are governed by immutable AI rules.',
        enforcement: 'Technical: Hard-coded governance engine with no override capability.',
        amendable: false
      },
      {
        id: 4,
        title: 'Human-Proof Enforcement',
        title_ar: 'تنفيذ مقاوم للتدخل البشري',
        description: 'No human (founder, manager, admin, investor) can override constitutional logic.',
        enforcement: 'Technical: All governance decisions require AI validation hash.',
        amendable: false
      },
      {
        id: 5,
        title: 'Immutable Auditability',
        title_ar: 'قابلية التدقيق غير القابلة للتغيير',
        description: 'Every action is logged in an append-only, hash-chained ledger.',
        enforcement: 'Technical: Append-only database with hash chains. No UPDATE or DELETE operations.',
        amendable: false
      },
      {
        id: 6,
        title: 'One Identity Rule',
        title_ar: 'قاعدة الهوية الواحدة',
        description: 'One government-issued ID = one account permanently.',
        enforcement: 'Technical: AI liveness detection + OCR + duplicate detection.',
        amendable: false
      },
      {
        id: 7,
        title: 'Transparency Mandate',
        title_ar: 'أمر الشفافية',
        description: 'All constitutional rules are publicly viewable.',
        enforcement: 'Technical: Public API endpoint + Constitution Viewer UI.',
        amendable: true,
        amendment_requirement: '75% supermajority + 90-day cooling period + law firm review'
      },
      {
        id: 8,
        title: 'JOZOUR Dual Compensation Model',
        title_ar: 'نموذج تعويض جذور المزدوج',
        description: 'JOZOUR takes a fixed 2.5% cash commission on funds raised PLUS 2.5% equity stake in every project (Tiers A, B, C). JOZOUR also holds a guaranteed 5-year board seat with VETO power over illegal or unconstitutional actions. After 5 years, shareholders vote on whether JOZOUR retains its board seat. For Tier D (existing companies), only 2.5% cash commission applies — no equity or board seat.',
        enforcement: 'Technical + Legal: Fee structure hard-coded per tier. Board seat term automatically tracked with 5-year expiry and mandatory shareholder vote for renewal.',
        amendable: false
      }
    ],
    jozour_fee_model: {
      description: 'JOZOUR Dual Compensation: Cash Commission + Equity Stake',
      tiers: {
        A: { cash_commission: '2.5%', equity_stake: '2.5%', board_seat: true, board_term: '5 years', veto_power: true, renewal: 'Shareholder vote after 5 years' },
        B: { cash_commission: '2.5%', equity_stake: '2.5%', board_seat: true, board_term: '5 years', veto_power: true, renewal: 'Shareholder vote after 5 years' },
        C: { cash_commission: '2.5%', equity_stake: '2.5%', board_seat: true, board_term: '5 years', veto_power: true, renewal: 'Shareholder vote after 5 years' },
        D: { cash_commission: '2.5%', equity_stake: '0%', board_seat: false, board_term: 'N/A', veto_power: false, renewal: 'N/A' }
      },
      veto_scope: 'JOZOUR veto applies ONLY to actions that violate constitutional rules, Egyptian law, or regulatory requirements. JOZOUR cannot veto legitimate business decisions.',
      after_5_years: 'At the 5-year mark, an automatic shareholder vote is triggered (jozour_retention_vote). Simple majority (>50%) decides retention. If voted out, JOZOUR retains equity but loses board seat and veto power.'
    },
    governance_rules: {
      voting: {
        power: '1 share = 1 vote',
        quorum: '51% of voting power required',
        standard_majority: '>50% for standard resolutions',
        supermajority: '75% for constitutional amendments',
        notice_period: '48 hours via email/SMS/WhatsApp/in-app',
        inactive_rule: 'Auto-yes (deemed consent) after 48h',
        proxy: 'Allowed with digital authorization',
        notarization: 'All results digitally notarized by law firm'
      },
      board_composition: {
        mandatory_roles: [
          'Founder Representative',
          'Manager (Independent or Founder-led)',
          'Independent Licensed Accountant',
          'Large Shareholder Representatives (>10% holders)',
          'JOZOUR Representative (5yr term, Veto on illegal actions for Tiers A/B/C)'
        ]
      },
      transaction_approval: {
        under_1_percent: 'Manager approval only',
        between_1_10_percent: 'Dual signature: Manager + Independent Accountant',
        over_10_percent: 'Full Board vote required (48h notice)'
      },
      emergency_protocols: {
        freeze_triggers: ['Fraud probability > constitutional threshold', 'Manager-accountant collusion detected', 'Escrow breach attempt'],
        recall: '72-hour shareholder vote for capital return in extreme cases'
      }
    },
    project_tiers: {
      A: { name: 'New Idea, No Experience', max_raise: '3,000,000 EGP', jozour_commission: '2.5%', jozour_equity: '2.5%', jozour_board: '5yr + veto' },
      B: { name: 'New Idea, Medium Experience', max_raise: '25,000,000 EGP', jozour_commission: '2.5%', jozour_equity: '2.5%', jozour_board: '5yr + veto' },
      C: { name: 'New Idea, Expert Founder', max_raise: 'Unlimited', jozour_commission: '2.5%', jozour_equity: '2.5%', jozour_board: '5yr + veto' },
      D: { name: 'Existing Company Expansion', max_raise: 'Unlimited', jozour_commission: '2.5%', jozour_equity: '0%', jozour_board: 'None' }
    },
    ai_modules: [
      'Feasibility AI (Project viability scoring 0-100)',
      'JOZOUR Valuation Algorithm v3.0 (Weighted blend)',
      'AI Salary Calculation Engine',
      'Fraud Detection & Anomaly Patterns',
      'Risk Prediction System (5-category)',
      'Reputation Scoring (Investor/Founder/Board)',
      'Health Scoring (0-100 company wellness)',
      'Tax Automation (Egyptian ETA Form 41)',
      'JOZOUR Board Term Tracker & Auto-Vote Trigger'
    ],
    hard_limits_non_amendable: [
      'Zero custody — platform never holds funds',
      'Escrow separation — law-firm accounts only',
      'AI-locked enforcement — no human overrides',
      'One ID per account — permanent binding',
      'JOZOUR 2.5% commission + 2.5% equity (Tiers A/B/C)',
      'JOZOUR 5-year board seat with veto (Tiers A/B/C)',
      'Mandatory shareholder vote on JOZOUR renewal at 5-year mark'
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

  // Verify chain integrity
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

// JOZOUR Board Term Status (public)
constitutionRoutes.get('/jozour-terms', async (c) => {
  const projects = await c.env.DB.prepare(`
    SELECT p.id, p.title, p.tier, p.jozour_equity_percent, p.jozour_commission_percent,
           p.jozour_veto_active, p.jozour_board_term_start, p.jozour_board_term_end,
           p.jozour_term_renewed, p.status,
           b.status as board_status, b.term_start, b.term_end, b.has_veto
    FROM projects p 
    LEFT JOIN board_members b ON p.id = b.project_id AND b.role = 'jozour_observer'
    WHERE p.status NOT IN ('draft', 'rejected', 'dissolved')
    ORDER BY p.created_at DESC
  `).all()

  return c.json({
    jozour_board_terms: projects.results,
    model: {
      commission: '2.5% cash on all tiers',
      equity: '2.5% for Tiers A/B/C, 0% for Tier D',
      board_term: '5 years with veto for Tiers A/B/C',
      renewal: 'Shareholder vote at 5-year mark'
    }
  })
})
