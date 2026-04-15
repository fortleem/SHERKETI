-- SHERKETI Platform Seed Data v3.1
-- Blueprint Aligned: 2.5% cash + 2.5% equity ALL tiers (A/B/C/D)

-- Users (Demo Accounts - password: admin123)
INSERT OR IGNORE INTO users (id, email, password_hash, full_name, full_name_ar, user_type, role, national_id, phone, verification_status, kyc_level, aml_cleared, sanctions_cleared, reputation_score, region) VALUES
(1, 'admin@sherketi.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'SHERKETI Platform', 'منصة شركتي', 'egyptian_company', 'admin', 'ADM-SHERKETI-001', '+20-100-000-0000', 'verified', 3, 1, 1, 100, 'cairo'),
(2, 'lawfirm@elmasry-law.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'El-Masry & Partners Law Firm', 'مكتب المصري وشركاه للمحاماة', 'egyptian_company', 'law_firm', 'LF-EMP-29501234', '+20-2-2345-6789', 'verified', 3, 1, 1, 95, 'cairo'),
(3, 'ahmed@techstartup.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Ahmed Hassan', 'أحمد حسن', 'egyptian_individual', 'founder', '29501011234567', '+20-100-123-4567', 'verified', 2, 1, 1, 85, 'cairo'),
(4, 'sara@gmail.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Sara Mohamed', 'سارة محمد', 'egyptian_individual', 'investor', '29801022345678', '+20-101-234-5678', 'verified', 2, 1, 1, 78, 'cairo'),
(5, 'omar@investment.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Omar Farouk', 'عمر فاروق', 'egyptian_individual', 'investor', '29001033456789', '+20-102-345-6789', 'verified', 2, 1, 1, 82, 'alexandria'),
(6, 'fatma@gmail.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Fatma Ali', 'فاطمة علي', 'egyptian_individual', 'investor', '29201044567890', '+20-103-456-7890', 'verified', 2, 1, 1, 70, 'cairo'),
(7, 'accountant@audit.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Dr. Khaled Ibrahim', 'د. خالد إبراهيم', 'egyptian_individual', 'accountant', '28501055678901', '+20-104-567-8901', 'verified', 2, 1, 1, 92, 'cairo'),
(8, 'manager@sherketi.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Mostafa Kamel', 'مصطفى كامل', 'egyptian_individual', 'manager', '29101066789012', '+20-105-678-9012', 'verified', 2, 1, 1, 88, 'cairo'),
(9, 'regulator@fra.gov.eg', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'FRA Shadow Observer', 'مراقب الرقابة المالية', 'egyptian_company', 'regulator', 'FRA-OBS-001', '+20-2-3579-1113', 'verified', 3, 1, 1, 100, 'cairo'),
(10, 'layla@food.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Layla Mahmoud', 'ليلى محمود', 'egyptian_individual', 'founder', '30001077890123', '+20-106-789-0123', 'verified', 2, 1, 1, 65, 'cairo');

-- Projects (Blueprint v3.1 fee model: 2.5% cash + 2.5% equity ALL tiers)
-- Project 1: NileTech (Tier B)
INSERT OR IGNORE INTO projects (id, founder_id, title, title_ar, description, sector, tier, status, law_firm_id, funding_goal, funding_raised, min_investment, equity_offered, pre_money_valuation, post_money_valuation, ai_feasibility_score, jozour_commission_percent, jozour_equity_percent, jozour_veto_active, jozour_board_term_start, jozour_board_term_end, founder_equity_percent, founder_dividend_bonus, founder_is_manager, founder_manager_banned, investor_cap_type, interest_votes, soft_pledges, health_score, escrow_account_id, company_region, annual_revenue, net_profit, total_shares, fundamental_share_price, eps, nav_per_share, sector_pe, growth_multiplier) VALUES
(1, 3, 'NileTech Solutions', 'نايل تك سوليوشنز', 'AI-powered SaaS for Egyptian businesses. NileTech provides cloud-based enterprise resource planning, CRM, and business intelligence tools tailored for the Egyptian market.', 'Technology', 'B', 'live_fundraising', 2, 5000000, 2750000, 100, 25, 15000000, 20000000, 82, 2.5, 2.5, 1, '2026-01-15', '2031-01-15', 5.0, 0, 0, 0, 'unlimited', 350, 2000000, 75, 'ESC-NT-001', 'cairo', 3000000, 800000, 10000, 1500, 80, 120, 18, 1.45);

-- Project 2: Koshary Kings (Tier A)
INSERT OR IGNORE INTO projects (id, founder_id, title, title_ar, description, sector, tier, status, funding_goal, funding_raised, min_investment, equity_offered, ai_feasibility_score, jozour_commission_percent, jozour_equity_percent, jozour_veto_active, founder_equity_percent, founder_dividend_bonus, founder_is_manager, founder_manager_banned, investor_cap_type, interest_votes, soft_pledges, health_score, company_region, total_shares) VALUES
(2, 10, 'Koshary Kings', 'ملوك الكشري', 'Chain of authentic Egyptian koshary restaurants across Cairo and Alexandria. Preserving traditional recipes with modern delivery infrastructure.', 'Food & Beverage', 'A', 'interest_phase', 2000000, 0, 50, 30, 68, 2.5, 2.5, 1, 5.0, 5.0, 0, 1, 'unlimited', 180, 850000, 50, 'cairo', 10000);

-- Project 3: SolarNile Energy (Tier C)
INSERT OR IGNORE INTO projects (id, founder_id, title, title_ar, description, sector, tier, status, law_firm_id, funding_goal, funding_raised, min_investment, equity_offered, pre_money_valuation, post_money_valuation, ai_feasibility_score, jozour_commission_percent, jozour_equity_percent, jozour_veto_active, jozour_board_term_start, jozour_board_term_end, founder_equity_percent, founder_dividend_bonus, founder_is_manager, founder_manager_banned, investor_cap_type, interest_votes, soft_pledges, health_score, escrow_account_id, company_region, annual_revenue, net_profit, total_shares, fundamental_share_price, eps, nav_per_share, sector_pe, growth_multiplier) VALUES
(3, 3, 'SolarNile Energy', 'طاقة النيل الشمسية', 'Residential and commercial solar panel installations across Egypt. Leading the green energy transition with AI-optimized solar farm management.', 'Green Energy', 'C', 'active', 2, 25000000, 25000000, 500, 20, 100000000, 125000000, 91, 2.5, 2.5, 1, '2025-03-01', '2030-03-01', 10.0, 35.0, 1, 0, 'limited', 1200, 30000000, 88, 'ESC-SN-001', 'cairo', 15000000, 5000000, 25000, 5000, 200, 400, 15, 1.8);

-- Project 4: NileBrew Café (Tier D)
INSERT OR IGNORE INTO projects (id, founder_id, title, title_ar, description, sector, tier, status, law_firm_id, funding_goal, funding_raised, min_investment, equity_offered, pre_money_valuation, post_money_valuation, ai_feasibility_score, jozour_commission_percent, jozour_equity_percent, jozour_veto_active, jozour_board_term_start, jozour_board_term_end, founder_equity_percent, founder_dividend_bonus, founder_is_manager, founder_manager_banned, investor_cap_type, investor_cap, ai_min_investment, interest_votes, soft_pledges, health_score, escrow_account_id, company_region, annual_revenue, net_profit, total_shares, fundamental_share_price, eps, nav_per_share, sector_pe, growth_multiplier, total_assets, total_liabilities) VALUES
(4, 3, 'Nile Brew Café', 'نايل بريو كافيه', 'Expanding chain of 5 artisan coffee shops in Cairo. Goal: open 5 new locations in Alexandria and Upper Egypt.', 'Food & Beverage', 'D', 'live_fundraising', 2, 15000000, 8000000, 50000, 20, 61200000, 76200000, 85, 2.5, 2.5, 1, '2026-04-01', '2031-04-01', 0, 0, 1, 0, 'limited', 100, 257143, 500, 18000000, 82, 'ESC-NB-001', 'cairo', 10000000, 8000000, 25000, 57.12, 3.2, 4.8, 12, 1.45, 15000000, 3000000);

-- Shareholdings
INSERT OR IGNORE INTO shareholdings (project_id, user_id, equity_percentage, shares_count, share_price, investment_amount, status, acquired_via) VALUES
-- NileTech
(1, 4, 8.0, 800, 1500, 1200000, 'active', 'primary'),
(1, 5, 5.5, 550, 1500, 825000, 'active', 'primary'),
(1, 6, 4.85, 485, 1500, 725000, 'active', 'primary'),
(1, 1, 2.5, 250, 0, 0, 'active', 'platform_fee'),
(1, 3, 5.0, 500, 0, 0, 'active', 'founder_allocation'),
-- SolarNile
(3, 4, 6.0, 1500, 5000, 7500000, 'active', 'primary'),
(3, 5, 4.0, 1000, 5000, 5000000, 'active', 'primary'),
(3, 6, 3.5, 875, 5000, 4375000, 'active', 'primary'),
(3, 1, 2.5, 625, 0, 0, 'active', 'platform_fee'),
(3, 3, 10.0, 2500, 0, 0, 'active', 'founder_allocation'),
-- NileBrew (Tier D)
(4, 4, 3.5, 875, 57.12, 2500000, 'active', 'primary'),
(4, 5, 3.5, 875, 57.12, 2500000, 'active', 'primary'),
(4, 6, 2.0, 500, 57.12, 1500000, 'active', 'primary'),
(4, 1, 2.5, 625, 0, 0, 'active', 'platform_fee'),
(4, 3, 51.4, 12850, 0, 0, 'active', 'founder_allocation');

-- Board Members
INSERT OR IGNORE INTO board_members (project_id, user_id, role, status, has_veto, veto_categories, term_start, term_end, term_years) VALUES
-- NileTech
(1, 3, 'founder_rep', 'active', 0, NULL, '2026-01-15', NULL, 0),
(1, 7, 'independent_accountant', 'active', 0, NULL, '2026-01-15', '2028-01-15', 2),
(1, 4, 'shareholder_rep', 'active', 0, NULL, '2026-01-15', '2027-01-15', 1),
(1, 1, 'jozour_observer', 'active', 1, '["zero_custody","escrow_non_approved","egyptian_law_violation","asset_sale_50pct","equity_dilution","platform_removal"]', '2026-01-15', '2031-01-15', 5),
(1, 8, 'manager', 'active', 0, NULL, '2026-01-15', NULL, 0),
-- SolarNile
(3, 3, 'founder_rep', 'active', 0, NULL, '2025-03-01', NULL, 0),
(3, 7, 'independent_accountant', 'active', 0, NULL, '2025-03-01', '2027-03-01', 2),
(3, 4, 'shareholder_rep', 'active', 0, NULL, '2025-06-01', '2026-06-01', 1),
(3, 1, 'jozour_observer', 'active', 1, '["zero_custody","escrow_non_approved","egyptian_law_violation","asset_sale_50pct","equity_dilution","platform_removal"]', '2025-03-01', '2030-03-01', 5),
-- NileBrew
(4, 3, 'founder_rep', 'active', 0, NULL, '2026-04-01', NULL, 0),
(4, 7, 'independent_accountant', 'active', 0, NULL, '2026-04-01', '2028-04-01', 2),
(4, 1, 'jozour_observer', 'active', 1, '["zero_custody","escrow_non_approved","egyptian_law_violation","asset_sale_50pct","equity_dilution","platform_removal"]', '2026-04-01', '2031-04-01', 5),
-- Koshary Kings
(2, 10, 'founder_rep', 'active', 0, NULL, '2026-03-01', NULL, 0),
(2, 1, 'jozour_observer', 'active', 1, '["zero_custody","escrow_non_approved","egyptian_law_violation","asset_sale_50pct","equity_dilution","platform_removal"]', NULL, NULL, 5);

-- Votes
INSERT OR IGNORE INTO votes (project_id, proposal_id, title, description, vote_type, status, required_majority, total_voting_power, votes_for, votes_against, voting_deadline) VALUES
(1, 1001, 'MVP Release Approval', 'Approve release of escrow funds for MVP launch milestone.', 'milestone_release', 'passed', 50.0, 20.85, 15.5, 5.35, '2026-03-01'),
(1, 1002, 'CTO Hiring Approval', 'Approve hiring a full-time CTO with equity compensation.', 'board_resolution', 'open', 50.0, 20.85, 0, 0, '2026-05-01'),
(3, 1003, 'Quarterly Dividend Distribution', 'Distribute Q1 2026 dividends from SolarNile net profits.', 'dividend_declaration', 'passed', 50.0, 26.0, 22.0, 4.0, '2026-04-01');

-- Escrow Transactions
INSERT OR IGNORE INTO escrow_transactions (project_id, transaction_type, amount, from_entity, to_entity, status, law_firm_stamp, completed_at) VALUES
(1, 'deposit', 2750000, 'investors', 'escrow', 'completed', 'LFS-2026-NT-001', '2026-02-01'),
(1, 'commission', 125000, 'escrow', 'SHERKETI', 'completed', 'LFS-2026-NT-002', '2026-02-01'),
(1, 'release', 1000000, 'escrow', 'NileTech Operations', 'completed', 'LFS-2026-NT-003', '2026-03-15'),
(3, 'deposit', 25000000, 'investors', 'escrow', 'completed', 'LFS-2025-SN-001', '2025-04-01'),
(3, 'commission', 625000, 'escrow', 'SHERKETI', 'completed', 'LFS-2025-SN-002', '2025-04-01'),
(3, 'insurance_vault', 125000, 'escrow', 'Insurance Vault', 'completed', 'LFS-2025-SN-IV', '2025-04-01'),
(3, 'release', 5000000, 'escrow', 'SolarNile Phase 1', 'completed', 'LFS-2025-SN-003', '2025-06-01'),
(3, 'release', 10000000, 'escrow', 'SolarNile Phase 2', 'completed', 'LFS-2025-SN-004', '2025-09-01'),
(3, 'dividend', 1000000, 'company', 'shareholders', 'completed', 'LFS-2026-SN-005', '2026-04-01'),
(4, 'deposit', 8000000, 'investors', 'escrow', 'completed', 'LFS-2026-NB-001', '2026-04-10'),
(4, 'commission', 200000, 'escrow', 'SHERKETI', 'completed', 'LFS-2026-NB-002', '2026-04-10');

-- Milestones
INSERT OR IGNORE INTO milestones (project_id, title, description, status, tranche_amount, tranche_percentage, order_index) VALUES
(1, 'MVP Launch', 'Launch minimum viable product with core ERP features for 10 pilot clients.', 'completed', 1000000, 20, 1),
(1, 'First 100 Clients', 'Acquire 100 paying enterprise clients across Egypt.', 'in_progress', 1500000, 30, 2),
(1, 'Regional Expansion', 'Expand to GCC markets (UAE, Saudi Arabia) with localized product.', 'pending', 2500000, 50, 3),
(2, 'First Restaurant', 'Open first Koshary Kings location in downtown Cairo.', 'pending', 600000, 30, 1),
(2, 'Delivery Platform', 'Launch delivery mobile app with 3 partner kitchens.', 'pending', 400000, 20, 2),
(2, 'Chain Expansion', 'Open 3 more locations: Heliopolis, Maadi, Alexandria.', 'pending', 1000000, 50, 3),
(3, '1,000 Solar Installations', 'Complete 1,000 residential solar installations across Cairo.', 'completed', 5000000, 20, 1),
(3, 'Delta Region Expansion', 'Expand to 5 Delta governorates with 500 commercial installations.', 'completed', 10000000, 40, 2),
(3, 'Commercial Segment', 'Launch commercial/industrial segment with 100MW capacity.', 'in_progress', 10000000, 40, 3),
(4, 'Alexandria Locations', 'Open 3 café locations in Alexandria.', 'in_progress', 6000000, 40, 1),
(4, 'Upper Egypt Locations', 'Open 2 locations in Assiut and Luxor.', 'pending', 5000000, 33, 2),
(4, 'Brand & Digital', 'Launch brand refresh and digital ordering system.', 'pending', 4000000, 27, 3);

-- Notifications
INSERT OR IGNORE INTO notifications (user_id, project_id, notification_type, title, message) VALUES
(4, 1, 'vote_notice', 'Vote Required: CTO Hiring', 'A board resolution for CTO hiring approval is open. Your voting power: 8%. Deadline: 48h.'),
(5, 1, 'milestone_update', 'Milestone Progress: First 100 Clients', 'NileTech has reached 78/100 client target. On track for Q2 2026 completion.'),
(4, 3, 'dividend_notice', 'Dividend Received: SolarNile Q1 2026', 'You received 60,000 EGP dividend from SolarNile Energy (6% of 1M EGP distribution).'),
(3, 4, 'funding_update', 'NileBrew Café: 53% Funded', 'Your project has raised 8M of 15M EGP. 47% remaining. 2 investor slots of 100 used.'),
(1, 3, 'jozour_info', 'SHERKETI Board Term Tracker', 'SolarNile board seat expires 2030-03-01. Retention vote will be auto-triggered 90 days before.');

-- Governance Events
INSERT OR IGNORE INTO governance_events (project_id, event_type, actor_id, ai_model, details) VALUES
(1, 'project_approved', NULL, 'gemma-2-27b', '{"score":82,"analysis":"Strong technology proposal with viable market","tier":"B","fee":"2.5% cash + 2.5% equity"}'),
(1, 'milestone_release', 7, 'governance-v2', '{"milestone":"MVP Launch","amount":1000000,"dual_sig":true}'),
(3, 'dividend_distribution', NULL, 'financial-ai-v1', '{"amount":1000000,"shareholders":4,"per_share":40,"withholding_tax":"10%"}'),
(3, 'valuation_update', NULL, 'valuation-ai-v3', '{"pre_money":100000000,"method":"jozour_v3","fundamental_price":5000}'),
(4, 'project_approved', NULL, 'gemma-2-27b', '{"score":85,"tier":"D","fee":"2.5% cash + 2.5% equity","investor_cap":100,"ai_min_investment":257143}');

-- Risk Alerts
INSERT OR IGNORE INTO risk_alerts (project_id, alert_level, risk_category, title, description, status) VALUES
(1, 'yellow', 'operational', 'Client Acquisition Below Target', 'Current client acquisition rate (8/week) is below the projected 12/week target. May impact milestone timeline.', 'active'),
(2, 'yellow', 'financial', 'Interest Phase Pledge Level', 'Soft pledges at 42.5% of goal (850K/2M EGP). Need 30% threshold (600K) - threshold met, but monitoring.', 'active');

-- Salary Records
INSERT OR IGNORE INTO salary_records (project_id, user_id, position, base_salary, tier_multiplier, performance_score, regional_adjustment, profit_factor, calculated_salary, period, status) VALUES
(1, 3, 'CEO/Founder', 35000, 1.0, 0.9, 1.0, 0.95, 29925, '2026-Q1', 'paid'),
(3, 3, 'CEO/Founder', 35000, 1.3, 1.1, 1.0, 1.1, 55055, '2026-Q1', 'paid');

-- Market Orders (Fundamental Pricing)
INSERT OR IGNORE INTO market_orders (project_id, seller_id, shares_count, equity_percentage, ask_price, ai_valuation, fundamental_price, price_band_low, price_band_high, status, priority_window_end) VALUES
(3, 5, 200, 0.8, 5000, 4800, 5000, 4750, 5250, 'priority_window', '2026-04-17');

-- Employee Registry (Add-on 3 demo)
INSERT OR IGNORE INTO employee_registry (project_id, full_name, position_title, role_description, department, employment_type, compensation_band, is_key_person, succession_plan_status) VALUES
(1, 'Youssef Tarek', 'Lead Developer', 'Full-stack development lead', 'Engineering', 'full_time', '18,000-22,000 EGP', 1, 'in_progress'),
(1, 'Nour El-Din', 'Sales Manager', 'Enterprise sales and partnerships', 'Sales', 'full_time', '14,000-18,000 EGP', 0, 'none'),
(1, 'Rania Khaled', 'Product Manager', 'Product strategy and roadmap', 'Product', 'full_time', '16,000-20,000 EGP', 1, 'ready'),
(3, 'Eng. Mohamed Said', 'Solar Installation Lead', 'Oversees all installation projects', 'Operations', 'full_time', '25,000-30,000 EGP', 1, 'in_progress'),
(3, 'Heba Mostafa', 'Finance Director', 'Financial operations and reporting', 'Finance', 'full_time', '22,000-28,000 EGP', 1, 'ready'),
(4, 'Chef Hassan Ali', 'Head Barista', 'Coffee program and training', 'Operations', 'full_time', '12,000-15,000 EGP', 1, 'in_progress');

-- Insurance Vault
INSERT OR IGNORE INTO insurance_vault (project_id, contribution_amount, contribution_type, vault_balance) VALUES
(3, 125000, 'fundraising', 125000);
