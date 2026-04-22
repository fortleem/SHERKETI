-- SHERKETI Platform Gap Closure Migration v3.4
-- Closes ALL remaining gaps from Blueprint v3.1
-- Parts XIV (Exit), XV (ESG), XVI (Industry), XVII (Academy), XIX (Compliance)

-- =============================================
-- CONTRACTS (Part IX.3)
-- =============================================
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  contract_type TEXT NOT NULL CHECK(contract_type IN ('employment','supplier','customer','loan','partnership','nda','shareholder_agreement','service','lease','other')),
  title TEXT NOT NULL,
  parties TEXT NOT NULL,
  value REAL,
  currency TEXT DEFAULT 'EGP',
  start_date DATETIME,
  end_date DATETIME,
  auto_renewal INTEGER DEFAULT 0,
  renewal_notice_days INTEGER DEFAULT 30,
  termination_clause TEXT,
  ai_risk_score REAL,
  ai_risk_analysis TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending_review','active','renewed','terminated','expired')),
  law_firm_stamp TEXT,
  notarized INTEGER DEFAULT 0,
  notarization_hash TEXT,
  document_hash TEXT,
  liability_type TEXT DEFAULT 'company' CHECK(liability_type IN ('company','personal','mixed')),
  personal_guarantee_vote_id INTEGER,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================================
-- WHISTLEBLOWER REPORTS (Add-on 3 / Part IX.4)
-- =============================================
CREATE TABLE IF NOT EXISTS whistleblower_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  report_type TEXT NOT NULL CHECK(report_type IN ('fraud','harassment','safety','corruption','misconduct','other')),
  description TEXT NOT NULL,
  evidence_hash TEXT,
  ai_confidence REAL,
  ai_validation TEXT,
  status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted','ai_validated','under_investigation','resolved','dismissed')),
  shared_with_shareholders INTEGER DEFAULT 0,
  investigation_vote_id INTEGER,
  anonymous_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- =============================================
-- MATCHMAKING PROFILES (Add-on 10)
-- =============================================
CREATE TABLE IF NOT EXISTS matchmaking_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  risk_tolerance REAL DEFAULT 5.0,
  sector_preferences TEXT,
  expected_irr REAL,
  min_investment REAL,
  max_investment REAL,
  investment_horizon TEXT DEFAULT 'medium' CHECK(investment_horizon IN ('short','medium','long','patient_capital')),
  esg_focus INTEGER DEFAULT 0,
  preferred_tiers TEXT,
  preferred_regions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS matchmaking_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  investor_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  compatibility_score REAL NOT NULL,
  score_breakdown TEXT,
  priority_level TEXT DEFAULT 'general' CHECK(priority_level IN ('priority_48h','secondary','general')),
  introduced INTEGER DEFAULT 0,
  invested INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (investor_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- =============================================
-- BANKRUPTCY AUCTIONS (Add-on 13 / Part XXII.8)
-- =============================================
CREATE TABLE IF NOT EXISTS bankruptcy_auctions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  trigger_reason TEXT NOT NULL,
  health_score_at_trigger REAL,
  total_estimated_value REAL,
  reserve_price REAL,
  assets_listing TEXT NOT NULL,
  status TEXT DEFAULT 'triggered' CHECK(status IN ('triggered','shareholder_priority','open_auction','completed','cancelled')),
  shareholder_priority_end DATETIME,
  auction_end DATETIME,
  winning_bid REAL,
  winner_id INTEGER,
  distribution_waterfall TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS auction_bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id INTEGER NOT NULL,
  bidder_id INTEGER NOT NULL,
  bid_amount REAL NOT NULL,
  bid_type TEXT DEFAULT 'general' CHECK(bid_type IN ('shareholder_priority','general')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','outbid','winning','cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (auction_id) REFERENCES bankruptcy_auctions(id),
  FOREIGN KEY (bidder_id) REFERENCES users(id)
);

-- =============================================
-- EXIT READINESS (Part XIV)
-- =============================================
CREATE TABLE IF NOT EXISTS exit_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  exit_type TEXT NOT NULL CHECK(exit_type IN ('ma','mbo','ipo','secondary_liquidity','dividend_perpetual')),
  readiness_score REAL NOT NULL,
  operational_maturity REAL,
  financial_predictability REAL,
  governance_stability REAL,
  market_position REAL,
  readiness_level TEXT CHECK(readiness_level IN ('early','developing','ready','optimal')),
  recommendations TEXT,
  ai_analysis TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- =============================================
-- ESG SCORES (Part XV)
-- =============================================
CREATE TABLE IF NOT EXISTS esg_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  environmental_score REAL DEFAULT 0,
  social_score REAL DEFAULT 0,
  governance_score REAL DEFAULT 0,
  overall_score REAL DEFAULT 0,
  carbon_footprint REAL,
  resource_efficiency REAL,
  waste_management REAL,
  employee_welfare REAL,
  community_impact REAL,
  jobs_created INTEGER DEFAULT 0,
  sdg_alignment TEXT,
  green_certified INTEGER DEFAULT 0,
  diversity_metrics TEXT,
  economic_multiplier REAL,
  formalization_impact INTEGER DEFAULT 0,
  export_value REAL DEFAULT 0,
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- =============================================
-- GAFI REGISTRATIONS (Add-on 15 / Part XIX)
-- =============================================
CREATE TABLE IF NOT EXISTS gafi_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  registration_type TEXT NOT NULL CHECK(registration_type IN ('company_registration','trade_name','commercial_registry','foreign_investment','golden_license','incentive_application','ubo_validation')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','submitted','processing','approved','rejected','expired')),
  gafi_reference_number TEXT,
  submission_data TEXT,
  response_data TEXT,
  incentives_applied TEXT,
  tax_credits REAL DEFAULT 0,
  webhook_events TEXT,
  submitted_at DATETIME,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- =============================================
-- DIVIDEND RECORDS (Part IX.5)
-- =============================================
CREATE TABLE IF NOT EXISTS dividend_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  shareholder_id INTEGER NOT NULL,
  declaration_vote_id INTEGER,
  gross_amount REAL NOT NULL,
  tax_withheld REAL DEFAULT 0,
  net_amount REAL NOT NULL,
  equity_percentage REAL NOT NULL,
  dividend_bonus REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'declared' CHECK(payment_status IN ('declared','processing','paid','failed')),
  payment_reference TEXT,
  period TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (shareholder_id) REFERENCES users(id)
);

-- =============================================
-- SOFT PLEDGES (Part VII.1)
-- =============================================
CREATE TABLE IF NOT EXISTS soft_pledges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  investor_id INTEGER NOT NULL,
  pledge_amount REAL NOT NULL,
  credibility_weight REAL DEFAULT 1.0,
  converted_to_reservation INTEGER DEFAULT 0,
  reservation_id INTEGER,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','converted','expired','withdrawn')),
  priority_window_used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (investor_id) REFERENCES users(id)
);

-- =============================================
-- RESERVATIONS (Part VII.2)
-- =============================================
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  investor_id INTEGER NOT NULL,
  shares_count INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'reserved' CHECK(status IN ('reserved','extended','paid','cancelled','expired','waitlisted')),
  reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  extension_used INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  converted_from_pledge INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (investor_id) REFERENCES users(id)
);

-- =============================================
-- ACADEMY (Part XVII)
-- =============================================
CREATE TABLE IF NOT EXISTS academy_certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  certification_type TEXT NOT NULL CHECK(certification_type IN ('first_time_investor','founder_readiness','board_member_excellence','company_manager','advanced_governance','esg_specialist')),
  status TEXT DEFAULT 'enrolled' CHECK(status IN ('enrolled','in_progress','completed','expired')),
  score REAL,
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER NOT NULL,
  certificate_hash TEXT,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS academy_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  title_ar TEXT,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('case_study','template','research_report','market_analysis','legal_guide','tax_guide','video','webinar','workshop')),
  category TEXT NOT NULL,
  description TEXT,
  content_hash TEXT,
  access_level TEXT DEFAULT 'public' CHECK(access_level IN ('public','verified','certified')),
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDUSTRY MODULES (Part XVI)
-- =============================================
CREATE TABLE IF NOT EXISTS industry_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  sector TEXT NOT NULL,
  module_type TEXT NOT NULL CHECK(module_type IN ('risk_management','technology_integration','supply_chain','export_certification','quality_control','automation_roi','ip_protection','talent_acquisition','seasonality','crisis_management')),
  assessment_data TEXT NOT NULL,
  ai_recommendations TEXT,
  score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- =============================================
-- PROXY VOTING (Part VIII.2)
-- =============================================
CREATE TABLE IF NOT EXISTS proxy_authorizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grantor_id INTEGER NOT NULL,
  proxy_id INTEGER NOT NULL,
  project_id INTEGER,
  scope TEXT DEFAULT 'all' CHECK(scope IN ('all','specific_vote','time_limited')),
  vote_id INTEGER,
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','revoked','expired','used')),
  authorization_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grantor_id) REFERENCES users(id),
  FOREIGN KEY (proxy_id) REFERENCES users(id)
);

-- =============================================
-- DIGITAL NOTARIZATIONS (Part VI / VIII)
-- =============================================
CREATE TABLE IF NOT EXISTS digital_notarizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('vote_resolution','contract','escrow_release','ownership_transfer','manager_change','board_resolution','milestone_completion','dividend_declaration','share_transfer')),
  entity_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  law_firm_id INTEGER,
  notarization_hash TEXT NOT NULL,
  timestamp_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','stamped','verified','rejected')),
  stamped_at DATETIME,
  ledger_reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (law_firm_id) REFERENCES users(id)
);

-- =============================================
-- MARKET PRICE LOCKS (Part XI.3)
-- =============================================
CREATE TABLE IF NOT EXISTS price_locks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  locked_price REAL NOT NULL,
  lock_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  lock_end DATETIME NOT NULL,
  new_ai_price REAL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','adjusted','expired','cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (order_id) REFERENCES market_orders(id)
);

-- =============================================
-- LIQUIDITY RESERVE (Part XI.3)
-- =============================================
CREATE TABLE IF NOT EXISTS liquidity_reserve (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  reserve_balance REAL DEFAULT 0,
  backstop_active INTEGER DEFAULT 0,
  consecutive_sell_days INTEGER DEFAULT 0,
  last_backstop_trigger DATETIME,
  shares_held INTEGER DEFAULT 0,
  avg_purchase_price REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- =============================================
-- FRA REGULATOR DASHBOARD (Part XIX.1)
-- =============================================
CREATE TABLE IF NOT EXISTS regulator_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL CHECK(report_type IN ('quarterly_summary','escrow_balances','governance_events','market_volume','jobs_created','tax_contributions','compliance_incidents')),
  period TEXT NOT NULL,
  data TEXT NOT NULL,
  generated_by TEXT DEFAULT 'ai',
  status TEXT DEFAULT 'generated' CHECK(status IN ('generated','submitted','acknowledged')),
  submitted_to TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- COMMUNITY FEATURES (Part XVII.4)
-- =============================================
CREATE TABLE IF NOT EXISTS investment_clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  club_type TEXT DEFAULT 'regional' CHECK(club_type IN ('regional','sector','university','general')),
  member_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS club_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin','moderator','member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES investment_clubs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- ADDITIONAL INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_whistleblower_project ON whistleblower_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_user ON matchmaking_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_results_investor ON matchmaking_results(investor_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_results_project ON matchmaking_results(project_id);
CREATE INDEX IF NOT EXISTS idx_bankruptcy_project ON bankruptcy_auctions(project_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_exit_project ON exit_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_esg_project ON esg_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_gafi_project ON gafi_registrations(project_id);
CREATE INDEX IF NOT EXISTS idx_dividend_records_project ON dividend_records(project_id);
CREATE INDEX IF NOT EXISTS idx_dividend_records_shareholder ON dividend_records(shareholder_id);
CREATE INDEX IF NOT EXISTS idx_soft_pledges_project ON soft_pledges(project_id);
CREATE INDEX IF NOT EXISTS idx_soft_pledges_investor ON soft_pledges(investor_id);
CREATE INDEX IF NOT EXISTS idx_reservations_project ON reservations(project_id);
CREATE INDEX IF NOT EXISTS idx_reservations_investor ON reservations(investor_id);
CREATE INDEX IF NOT EXISTS idx_academy_cert_user ON academy_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_industry_project ON industry_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_proxy_grantor ON proxy_authorizations(grantor_id);
CREATE INDEX IF NOT EXISTS idx_notarizations_project ON digital_notarizations(project_id);
CREATE INDEX IF NOT EXISTS idx_price_locks_project ON price_locks(project_id);
CREATE INDEX IF NOT EXISTS idx_liquidity_reserve_project ON liquidity_reserve(project_id);
