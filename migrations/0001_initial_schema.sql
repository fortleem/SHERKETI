-- SHERKETI Platform Complete Database Schema v2.0
-- Constitutional AI-Governed Equity Crowdfunding Platform
-- Updated: JOZOUR takes 2.5% cash commission + 2.5% equity + 5yr board seat with veto (Tier A/B/C)

-- Users Table (KYC/Identity)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  user_type TEXT NOT NULL CHECK(user_type IN ('egyptian_individual','foreigner_in_egypt','foreigner_outside','egyptian_company','foreign_company')),
  role TEXT NOT NULL DEFAULT 'investor' CHECK(role IN ('investor','founder','manager','accountant','law_firm','admin','regulator')),
  national_id TEXT UNIQUE,
  passport_number TEXT,
  commercial_register TEXT,
  tax_card TEXT,
  phone TEXT,
  phone_verified INTEGER DEFAULT 0,
  selfie_hash TEXT,
  id_document_hash TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','under_review','verified','rejected','banned')),
  kyc_level INTEGER DEFAULT 0,
  aml_cleared INTEGER DEFAULT 0,
  pep_status INTEGER DEFAULT 0,
  sanctions_cleared INTEGER DEFAULT 0,
  risk_profile TEXT DEFAULT 'standard' CHECK(risk_profile IN ('low','standard','elevated','high')),
  reputation_score REAL DEFAULT 50.0,
  reputation_details TEXT,
  ban_until DATETIME,
  ban_reason TEXT,
  region TEXT DEFAULT 'cairo' CHECK(region IN ('cairo','alexandria','delta','upper_egypt','other')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  founder_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  sector TEXT NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('A','B','C','D')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ai_review','interest_phase','live_fundraising','funded','active','frozen','dissolved','rejected')),
  law_firm_id INTEGER,
  funding_goal REAL NOT NULL,
  funding_raised REAL DEFAULT 0,
  min_investment REAL DEFAULT 50,
  equity_offered REAL NOT NULL,
  pre_money_valuation REAL,
  post_money_valuation REAL,
  ai_feasibility_score REAL,
  ai_feasibility_details TEXT,
  ai_valuation_details TEXT,
  governance_state TEXT DEFAULT 'pre_funding',
  jozour_equity_percent REAL DEFAULT 2.5,
  jozour_commission_percent REAL DEFAULT 2.5,
  jozour_veto_active INTEGER DEFAULT 1,
  jozour_board_term_start DATETIME,
  jozour_board_term_end DATETIME,
  jozour_term_renewed INTEGER DEFAULT 0,
  interest_votes INTEGER DEFAULT 0,
  soft_pledges REAL DEFAULT 0,
  interest_phase_start DATETIME,
  interest_phase_end DATETIME,
  funding_start DATETIME,
  funding_end DATETIME,
  business_plan_hash TEXT,
  financial_docs_hash TEXT,
  milestones TEXT,
  health_score REAL DEFAULT 50.0,
  risk_level TEXT DEFAULT 'standard',
  quarterly_reports TEXT,
  escrow_account_id TEXT,
  company_region TEXT DEFAULT 'cairo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (founder_id) REFERENCES users(id),
  FOREIGN KEY (law_firm_id) REFERENCES users(id)
);

-- Shareholdings Table
CREATE TABLE IF NOT EXISTS shareholdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  equity_percentage REAL NOT NULL,
  shares_count INTEGER NOT NULL DEFAULT 0,
  share_price REAL,
  investment_amount REAL NOT NULL,
  vesting_schedule TEXT,
  vested_percentage REAL DEFAULT 100.0,
  dividend_rights INTEGER DEFAULT 1,
  voting_power REAL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','reserved','vesting','frozen','sold','transferred')),
  acquired_via TEXT DEFAULT 'primary' CHECK(acquired_via IN ('primary','secondary','vesting','platform_fee','commission')),
  reserved_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Board Members Table (with term tracking for JOZOUR 5yr seat)
CREATE TABLE IF NOT EXISTS board_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('founder_rep','manager','independent_accountant','shareholder_rep','jozour_observer')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','removed','resigned','term_expired','pending_renewal_vote')),
  has_veto INTEGER DEFAULT 0,
  term_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  term_end DATETIME,
  term_years INTEGER DEFAULT 0,
  renewal_vote_id INTEGER,
  appointed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  removed_at DATETIME,
  reputation_score REAL DEFAULT 50.0,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Governance Events Table (Append-only Immutable Ledger)
CREATE TABLE IF NOT EXISTS governance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor_id INTEGER,
  ai_model TEXT,
  ai_rule_version TEXT,
  decision_hash TEXT,
  details TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- Votes Table (added jozour_retention_vote type)
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  proposal_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('board_resolution','shareholder_vote','milestone_release','manager_removal','constitutional_amendment','emergency_recall','expense_approval','jozour_retention_vote')),
  status TEXT DEFAULT 'open' CHECK(status IN ('open','passed','failed','expired','vetoed')),
  required_majority REAL DEFAULT 50.0,
  quorum_required REAL DEFAULT 51.0,
  total_voting_power REAL DEFAULT 0,
  votes_for REAL DEFAULT 0,
  votes_against REAL DEFAULT 0,
  abstentions REAL DEFAULT 0,
  auto_yes_power REAL DEFAULT 0,
  amount_involved REAL,
  notice_sent_at DATETIME,
  voting_deadline DATETIME,
  result_notarized INTEGER DEFAULT 0,
  vetoed_by TEXT,
  veto_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Individual Vote Records
CREATE TABLE IF NOT EXISTS vote_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('for','against','abstain','auto_yes')),
  voting_power REAL NOT NULL,
  proxy_for_user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vote_id) REFERENCES votes(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Escrow Transactions (added commission type)
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit','release','freeze','recall','dividend','fee','commission')),
  amount REAL NOT NULL,
  from_entity TEXT,
  to_entity TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','frozen','reversed')),
  requires_dual_signature INTEGER DEFAULT 0,
  manager_approved INTEGER DEFAULT 0,
  accountant_approved INTEGER DEFAULT 0,
  board_approved INTEGER DEFAULT 0,
  ai_risk_check TEXT,
  milestone_id INTEGER,
  law_firm_stamp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Milestones Table
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATETIME,
  completion_date DATETIME,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','overdue','failed')),
  tranche_amount REAL,
  tranche_percentage REAL,
  evidence_hash TEXT,
  ai_verification TEXT,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Secondary Market Orders
CREATE TABLE IF NOT EXISTS market_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  buyer_id INTEGER,
  shares_count INTEGER NOT NULL,
  equity_percentage REAL NOT NULL,
  ask_price REAL NOT NULL,
  bid_price REAL,
  ai_valuation REAL,
  status TEXT DEFAULT 'listed' CHECK(status IN ('listed','priority_window','matched','pending_board','completed','cancelled','expired')),
  priority_window_end DATETIME,
  board_approval_id INTEGER,
  law_firm_stamp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);

-- Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  filed_by INTEGER NOT NULL,
  against_user_id INTEGER,
  dispute_type TEXT NOT NULL CHECK(dispute_type IN ('financial','governance','operational','fraud','manager_removal','other')),
  status TEXT DEFAULT 'filed' CHECK(status IN ('filed','ai_mediation','board_review','shareholder_vote','law_firm_arbitration','resolved','dismissed')),
  description TEXT NOT NULL,
  ai_evidence TEXT,
  ai_suggested_resolution TEXT,
  resolution TEXT,
  mediation_deadline DATETIME,
  board_review_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (filed_by) REFERENCES users(id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER,
  notification_type TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app' CHECK(channel IN ('in_app','email','sms','whatsapp')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status INTEGER DEFAULT 0,
  action_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit Log (Immutable, Append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  ai_model TEXT,
  rule_version TEXT,
  output_hash TEXT,
  previous_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Risk Alerts
CREATE TABLE IF NOT EXISTS risk_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  alert_level TEXT NOT NULL CHECK(alert_level IN ('yellow','red')),
  risk_category TEXT NOT NULL CHECK(risk_category IN ('governance','financial','operational','compliance','reputation')),
  title TEXT NOT NULL,
  description TEXT,
  ai_analysis TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','acknowledged','resolved','escalated')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Salary Records
CREATE TABLE IF NOT EXISTS salary_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  position TEXT NOT NULL,
  base_salary REAL NOT NULL,
  tier_multiplier REAL NOT NULL,
  performance_score REAL NOT NULL,
  regional_adjustment REAL NOT NULL,
  profit_factor REAL NOT NULL,
  calculated_salary REAL NOT NULL,
  period TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','disputed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tax Records
CREATE TABLE IF NOT EXISTS tax_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  tax_type TEXT NOT NULL CHECK(tax_type IN ('capital_gains','dividend_withholding','vat')),
  gross_amount REAL NOT NULL,
  tax_rate REAL NOT NULL,
  tax_amount REAL NOT NULL,
  period TEXT,
  form_type TEXT DEFAULT 'form_41',
  status TEXT DEFAULT 'calculated' CHECK(status IN ('calculated','submitted','paid')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_projects_founder ON projects(founder_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_tier ON projects(tier);
CREATE INDEX IF NOT EXISTS idx_shareholdings_project ON shareholdings(project_id);
CREATE INDEX IF NOT EXISTS idx_shareholdings_user ON shareholdings(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_project ON votes(project_id);
CREATE INDEX IF NOT EXISTS idx_governance_project ON governance_events(project_id);
CREATE INDEX IF NOT EXISTS idx_escrow_project ON escrow_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_project ON market_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_project ON risk_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_board_members_project ON board_members(project_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user ON board_members(user_id);
