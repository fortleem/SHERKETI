-- SHERKETI Platform Seed Data v2.0
-- Updated JOZOUR Model: 2.5% cash commission + 2.5% equity + 5yr board seat with veto (Tiers A/B/C)

-- Admin user / JOZOUR representative (password: admin123 - sha256 hashed)
INSERT OR IGNORE INTO users (email, password_hash, full_name, full_name_ar, user_type, role, national_id, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region)
VALUES ('admin@sherketi.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'JOZOUR Platform', 'جذور المنصة', 'egyptian_individual', 'admin', '29901011234567', '+201001234567', 'verified', 3, 1, 1, 100, 'cairo');

-- Law Firm user
INSERT OR IGNORE INTO users (email, password_hash, full_name, full_name_ar, user_type, role, commercial_register, tax_card, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region)
VALUES ('lawfirm@elmasry-law.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'El-Masry & Partners Law Firm', 'مكتب المصري وشركاه للمحاماة', 'egyptian_company', 'law_firm', 'CR-12345', 'TC-67890', '+201112345678', 'verified', 3, 1, 1, 95, 'cairo');

-- Sample Founder
INSERT OR IGNORE INTO users (email, password_hash, full_name, full_name_ar, user_type, role, national_id, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region)
VALUES ('ahmed@techstartup.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Ahmed Hassan', 'أحمد حسن', 'egyptian_individual', 'founder', '29501151234567', '+201234567890', 'verified', 3, 1, 1, 78, 'cairo');

-- Sample Investors
INSERT OR IGNORE INTO users (email, password_hash, full_name, full_name_ar, user_type, role, national_id, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region)
VALUES 
('sara@gmail.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Sara Mohamed', 'سارة محمد', 'egyptian_individual', 'investor', '29801201234567', '+201098765432', 'verified', 2, 1, 1, 72, 'cairo'),
('omar@gmail.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Omar Farouk', 'عمر فاروق', 'egyptian_individual', 'investor', '29701101234567', '+201111222333', 'verified', 2, 1, 1, 65, 'alexandria'),
('fatma@gmail.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Fatma Ali', 'فاطمة علي', 'egyptian_individual', 'investor', '29601151234567', '+201222333444', 'verified', 2, 1, 1, 80, 'cairo');

-- Sample Independent Accountant
INSERT OR IGNORE INTO users (email, password_hash, full_name, full_name_ar, user_type, role, national_id, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region)
VALUES ('accountant@audit.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Dr. Khaled Ibrahim', 'د. خالد إبراهيم', 'egyptian_individual', 'accountant', '28501011234567', '+201333444555', 'verified', 3, 1, 1, 90, 'cairo');

-- Sample Manager
INSERT OR IGNORE INTO users (email, password_hash, full_name, full_name_ar, user_type, role, national_id, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region)
VALUES ('manager@sherketi.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Youssef Nasser', 'يوسف ناصر', 'egyptian_individual', 'manager', '29001011234567', '+201444555666', 'verified', 3, 1, 1, 85, 'cairo');

-- Sample Regulator
INSERT OR IGNORE INTO users (email, password_hash, full_name, full_name_ar, user_type, role, national_id, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region)
VALUES ('regulator@fra.gov.eg', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'FRA Observer', 'مراقب هيئة الرقابة المالية', 'egyptian_individual', 'regulator', '27001011234567', '+201555666777', 'verified', 3, 1, 1, 100, 'cairo');

-- ============ PROJECTS ============

-- Project 1: Tech Startup (Tier B - Live Fundraising)
-- JOZOUR gets: 2.5% commission (125K EGP) + 2.5% equity + 5yr board seat with veto
INSERT OR IGNORE INTO projects (founder_id, title, title_ar, description, sector, tier, status, law_firm_id, funding_goal, funding_raised, min_investment, equity_offered, pre_money_valuation, post_money_valuation, ai_feasibility_score, jozour_commission_percent, jozour_equity_percent, jozour_veto_active, jozour_board_term_start, jozour_board_term_end, interest_votes, soft_pledges, governance_state, health_score, company_region, escrow_account_id, milestones)
VALUES (3, 'NileTech Solutions', 'حلول نايل تك', 'AI-powered logistics optimization platform for Egyptian SMEs. Reduces delivery costs by 40% using machine learning route optimization and demand forecasting.', 'Technology', 'B', 'live_fundraising', 2, 5000000, 2750000, 100, 25.0, 15000000, 20000000, 82, 2.5, 2.5, 1, '2026-01-15', '2031-01-15', 847, 3200000, 'fundraising', 75, 'cairo', 'ESC-NT-001',
'[{"title":"MVP Launch","amount":1000000,"status":"completed"},{"title":"First 100 Clients","amount":1500000,"status":"in_progress"},{"title":"Regional Expansion","amount":2500000,"status":"pending"}]');

-- Project 2: Food Chain (Tier A - Interest Phase)
-- JOZOUR gets: 2.5% commission (50K EGP) + 2.5% equity + 5yr board seat with veto
INSERT OR IGNORE INTO projects (founder_id, title, title_ar, description, sector, tier, status, funding_goal, min_investment, equity_offered, ai_feasibility_score, jozour_commission_percent, jozour_equity_percent, jozour_veto_active, interest_votes, soft_pledges, governance_state, health_score, company_region, milestones)
VALUES (3, 'Koshary Kings', 'ملوك الكشري', 'Premium Egyptian street food franchise targeting Cairo and Alexandria. Modern twist on traditional koshary with health-conscious options and fast delivery.', 'Food & Beverage', 'A', 'interest_phase', 2000000, 50, 30.0, 68, 2.5, 2.5, 1, 312, 850000, 'pre_funding', 60, 'cairo',
'[{"title":"First Location Setup","amount":500000,"status":"pending"},{"title":"Menu & Branding","amount":300000,"status":"pending"},{"title":"Second Location","amount":1200000,"status":"pending"}]');

-- Project 3: Green Energy (Tier C - Active/Funded)
-- JOZOUR gets: 2.5% commission (625K EGP) + 2.5% equity + 5yr board seat with veto
INSERT OR IGNORE INTO projects (founder_id, title, title_ar, description, sector, tier, status, law_firm_id, funding_goal, funding_raised, min_investment, equity_offered, pre_money_valuation, post_money_valuation, ai_feasibility_score, jozour_commission_percent, jozour_equity_percent, jozour_veto_active, jozour_board_term_start, jozour_board_term_end, governance_state, health_score, company_region, escrow_account_id, milestones)
VALUES (3, 'SolarNile Energy', 'طاقة سولار نايل', 'Distributed solar panel installation and financing for Egyptian households. Partnering with local banks for micro-loans. 500+ installations completed.', 'Green Energy', 'C', 'active', 2, 25000000, 25000000, 500, 20.0, 100000000, 125000000, 91, 2.5, 2.5, 1, '2025-03-01', '2030-03-01', 'operational', 88, 'cairo', 'ESC-SN-001',
'[{"title":"1000 Installations","amount":5000000,"status":"completed"},{"title":"Delta Expansion","amount":10000000,"status":"completed"},{"title":"Commercial Segment","amount":10000000,"status":"in_progress"}]');

-- ============ SHAREHOLDINGS ============

-- NileTech: Founder 50%, JOZOUR 2.5% equity, Investors share the rest
INSERT OR IGNORE INTO shareholdings (project_id, user_id, equity_percentage, shares_count, share_price, investment_amount, status, acquired_via) VALUES 
(1, 3, 50.0, 5000, 100, 0, 'active', 'primary'),
(1, 4, 8.0, 800, 100, 800000, 'active', 'primary'),
(1, 5, 5.0, 500, 100, 500000, 'active', 'primary'),
(1, 6, 4.5, 450, 100, 450000, 'active', 'primary'),
(1, 1, 2.5, 250, 0, 0, 'active', 'platform_fee');

-- SolarNile: Founder 45%, JOZOUR 2.5% equity, Investors share rest
INSERT OR IGNORE INTO shareholdings (project_id, user_id, equity_percentage, shares_count, share_price, investment_amount, status, acquired_via) VALUES 
(3, 3, 45.0, 4500, 500, 0, 'active', 'primary'),
(3, 4, 10.0, 1000, 500, 5000000, 'active', 'primary'),
(3, 5, 7.0, 700, 500, 3500000, 'active', 'primary'),
(3, 6, 5.0, 500, 500, 2500000, 'active', 'primary'),
(3, 1, 2.5, 250, 0, 0, 'active', 'platform_fee');

-- ============ BOARD MEMBERS ============
-- JOZOUR has 5yr board seat with VETO for Tiers A/B/C

-- NileTech Board (Tier B = JOZOUR has veto)
INSERT OR IGNORE INTO board_members (project_id, user_id, role, status, has_veto, term_start, term_end, term_years) VALUES 
(1, 3, 'founder_rep', 'active', 0, '2026-01-15', NULL, 0),
(1, 8, 'manager', 'active', 0, '2026-01-15', NULL, 0),
(1, 7, 'independent_accountant', 'active', 0, '2026-01-15', NULL, 0),
(1, 4, 'shareholder_rep', 'active', 0, '2026-01-15', NULL, 0),
(1, 1, 'jozour_observer', 'active', 1, '2026-01-15', '2031-01-15', 5);

-- SolarNile Board (Tier C = JOZOUR has veto)
INSERT OR IGNORE INTO board_members (project_id, user_id, role, status, has_veto, term_start, term_end, term_years) VALUES 
(3, 3, 'founder_rep', 'active', 0, '2025-03-01', NULL, 0),
(3, 8, 'manager', 'active', 0, '2025-03-01', NULL, 0),
(3, 7, 'independent_accountant', 'active', 0, '2025-03-01', NULL, 0),
(3, 4, 'shareholder_rep', 'active', 0, '2025-03-01', NULL, 0),
(3, 1, 'jozour_observer', 'active', 1, '2025-03-01', '2030-03-01', 5);

-- ============ VOTES ============
INSERT OR IGNORE INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, total_voting_power, votes_for, votes_against, voting_deadline) VALUES 
(1, 1, 'Q1 Milestone Release - MVP Launch', 'Release 1,000,000 EGP for completed MVP milestone', 'milestone_release', 'passed', 50.0, 70.0, 63.0, 7.0, '2026-03-15'),
(1, 2, 'Hire CTO - Annual Package 600K EGP', 'Approve hiring of Chief Technology Officer', 'board_resolution', 'open', 50.0, 70.0, 0, 0, '2026-04-15'),
(3, 3, 'Quarterly Dividend Distribution', 'Distribute 2M EGP quarterly dividends pro-rata', 'shareholder_vote', 'passed', 50.0, 70.0, 66.0, 4.0, '2026-03-30');

-- ============ ESCROW TRANSACTIONS ============
INSERT OR IGNORE INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status, milestone_id, law_firm_stamp) VALUES 
(1, 'deposit', 2750000, 'investors', 'escrow', 'completed', NULL, 'LFS-NT-001'),
(1, 'commission', 125000, 'escrow', 'JOZOUR', 'completed', NULL, 'LFS-NT-COM'),
(1, 'release', 1000000, 'escrow', 'NileTech Solutions', 'completed', 1, 'LFS-NT-002'),
(3, 'deposit', 25000000, 'investors', 'escrow', 'completed', NULL, 'LFS-SN-001'),
(3, 'commission', 625000, 'escrow', 'JOZOUR', 'completed', NULL, 'LFS-SN-COM'),
(3, 'release', 5000000, 'escrow', 'SolarNile Energy', 'completed', 1, 'LFS-SN-002'),
(3, 'release', 10000000, 'escrow', 'SolarNile Energy', 'completed', 2, 'LFS-SN-003'),
(3, 'dividend', 2000000, 'SolarNile Energy', 'shareholders', 'completed', NULL, 'LFS-SN-004');

-- ============ MILESTONES ============
INSERT OR IGNORE INTO milestones (project_id, title, description, status, tranche_amount, tranche_percentage, order_index) VALUES 
(1, 'MVP Launch', 'Complete and launch minimum viable product', 'completed', 1000000, 20, 1),
(1, 'First 100 Clients', 'Acquire first 100 paying SME clients', 'in_progress', 1500000, 30, 2),
(1, 'Regional Expansion', 'Expand to Alexandria and Delta regions', 'pending', 2500000, 50, 3),
(3, '1000 Installations', 'Complete 1000 solar panel installations', 'completed', 5000000, 20, 1),
(3, 'Delta Expansion', 'Expand operations to Nile Delta region', 'completed', 10000000, 40, 2),
(3, 'Commercial Segment', 'Enter commercial/industrial solar market', 'in_progress', 10000000, 40, 3);

-- ============ NOTIFICATIONS ============
INSERT OR IGNORE INTO notifications (user_id, project_id, notification_type, title, message, action_url) VALUES
(4, 1, 'vote_notice', 'New Board Vote: Hire CTO', 'A new vote has been opened for NileTech Solutions. Please cast your vote within 48 hours.', '/dashboard/votes/2'),
(3, 1, 'milestone_update', 'Milestone Progress Update', 'First 100 Clients milestone is 67% complete. Keep pushing!', '/dashboard/projects/1'),
(5, 3, 'dividend_notice', 'Dividend Distribution', 'Your share of Q1 dividends: 350,000 EGP has been processed through escrow.', '/dashboard/portfolio'),
(3, 1, 'jozour_info', 'JOZOUR Board Seat Active', 'JOZOUR has a 5-year board seat with veto power on NileTech Solutions (expires Jan 2031).', '/dashboard/projects/1'),
(4, 3, 'jozour_info', 'JOZOUR Commission Paid', 'JOZOUR 2.5% cash commission (625,000 EGP) deducted from SolarNile escrow.', '/dashboard/projects/3');

-- ============ GOVERNANCE EVENTS ============
INSERT OR IGNORE INTO governance_events (project_id, event_type, actor_id, ai_model, ai_rule_version, decision_hash, details) VALUES 
(1, 'project_approved', 1, 'gemma-2-27b', 'v1.0', 'hash_abc123', '{"feasibility_score":82,"tier":"B","jozour_commission":"2.5%","jozour_equity":"2.5%","jozour_board":"5yr+veto"}'),
(1, 'jozour_board_seated', 1, 'governance-v2', 'v2.0', 'hash_joz001', '{"role":"jozour_observer","veto":true,"term":"5yr","expires":"2031-01-15"}'),
(1, 'milestone_released', 1, 'salary-engine-v1', 'v1.0', 'hash_def456', '{"milestone":"MVP Launch","amount":1000000,"board_vote":"passed"}'),
(3, 'project_funded', 1, 'governance-v2', 'v2.0', 'hash_fund01', '{"total":25000000,"commission":625000,"equity":"2.5%","board":"5yr+veto"}'),
(3, 'dividend_distributed', 1, 'governance-v1', 'v1.0', 'hash_ghi789', '{"total":2000000,"shareholders":5,"method":"pro_rata"}'),
(1, 'valuation_updated', NULL, 'jozour-valuation-v3', 'v3.0', 'hash_jkl012', '{"pre_money":15000000,"method":"weighted_blend","quarterly":"Q1_2026"}');

-- ============ RISK ALERTS ============
INSERT OR IGNORE INTO risk_alerts (project_id, alert_level, risk_category, title, description, status) VALUES 
(1, 'yellow', 'operational', 'Client Acquisition Below Target', 'Current client acquisition rate of 8/week is below the projected 12/week target for milestone completion.', 'active'),
(2, 'yellow', 'financial', 'Interest Phase Below 30%', 'Soft pledges at 42.5% of goal. Project needs to reach 30% threshold by end of interest phase.', 'acknowledged');

-- ============ SALARY RECORDS ============
INSERT OR IGNORE INTO salary_records (project_id, user_id, position, base_salary, tier_multiplier, performance_score, regional_adjustment, profit_factor, calculated_salary, period, status) VALUES 
(1, 3, 'CEO/Founder', 25000, 1.0, 1.2, 1.0, 0.9, 27000, '2026-Q1', 'paid'),
(3, 3, 'CEO/Founder', 45000, 1.3, 1.35, 1.0, 1.15, 90506, '2026-Q1', 'paid');

-- ============ MARKET ORDERS ============
INSERT OR IGNORE INTO market_orders (project_id, seller_id, shares_count, equity_percentage, ask_price, ai_valuation, status, priority_window_end) VALUES 
(3, 5, 200, 2.0, 650, 580, 'priority_window', '2026-04-14');
