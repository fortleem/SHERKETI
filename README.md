# SHERKETI v3.3.0 — AI-Governed Equity Crowdfunding Platform

## Blueprint v3.1 Comprehensive Edition — ALL Phases Complete — 0 Gaps Remaining

**Constitutional Hash:** `0x9b7e5a2d1f4c8e3a6b9d2f7c4e1a8b3d5f6c2a9e`
**Launch Date:** January 2026
**GitHub:** https://github.com/fortleem/SHERKETI
**Version:** 3.3.0 (Final Gap Closure)

---

## Fee Model (All Tiers A/B/C/D)
- **2.5% Cash Commission** — deducted from escrow at closing
- **2.5% Equity Stake** — non-dilutable, fully vested at closing
- **5-Year Board Seat** — with veto power (6 constitutional categories)
- **Shareholder Vote** — automatic ballot 90 days before 5-year term end

---

## 10 Immutable Constitutional Rules
1. **Zero Custody** — Platform never holds funds
2. **Escrow-Only Capital Flow** — All funds via licensed law-firm escrow
3. **AI-Locked Governance** — No human overrides on equity/dividends/voting
4. **Human-Proof Enforcement** — All overrides auto-rejected and logged
5. **Immutable Auditability** — Append-only ledger with hash chains
6. **One Identity Rule** — One government ID = one account permanently
7. **Transparency Mandate** — All rules publicly viewable (only amendable rule)
8. **Platform Fee Model** — 2.5% cash + 2.5% equity ALL tiers + 5yr board
9. **Fundamental-Only Pricing** — AI-calculated share price, no market-driven
10. **Founder Partner Limitation** — Investor cap with AI-enforced minimum

---

## Complete API Reference (80+ Endpoints across 12 Route Groups)

### 1. Auth (`/api/auth/`) — 5 endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register with One Identity Rule |
| POST | `/login` | Login with ban check |
| GET | `/me` | Get current user profile |
| POST | `/kyc/submit` | Submit KYC documents |
| POST | `/kyc/auto-approve` | Demo KYC auto-approval |

### 2. Projects (`/api/projects/`) — 7 endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List projects (filter by status/tier/sector) |
| GET | `/:id` | Full project details (shareholders, board, milestones, escrow) |
| POST | `/` | Create project (tier validation, fee model, founder rules) |
| POST | `/:id/submit-review` | AI feasibility review (score 0-100, auto-reject <35) |
| POST | `/:id/interest` | Record interest votes and soft pledges |
| POST | `/:id/go-live` | Start live fundraising (30% threshold) |
| POST | `/:id/invest` | Invest (escrow deposit, equity calc, auto-fund on goal) |
| POST | `/:id/milestones/:milestoneId/complete` | Mark milestone completed |

### 3. Governance (`/api/governance/`) — 14 endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/votes/:projectId` | List votes for project |
| POST | `/votes` | Create vote/proposal (48h deadline, notifications) |
| POST | `/votes/:voteId/cast` | Cast vote (SHERKETI veto check, quorum) |
| POST | `/check-jozour-terms` | Auto-trigger 5yr renewal votes |
| POST | `/votes/:voteId/veto` | SHERKETI veto (6 categories only) |
| GET | `/events/:projectId` | Governance events ledger |
| GET | `/board/:projectId` | Board members list |
| POST | `/milestone-release` | Request milestone release (dual-sig thresholds) |
| POST | `/escrow/:id/sign` | Accountant dual-signature |
| POST | `/disputes` | File dispute (48h AI mediation) |
| GET | `/disputes/:projectId` | List disputes |
| GET | `/notifications` | User notifications |
| POST | `/manager-removal` | Manager removal protocol (AI risk, tier consequences) |
| POST | `/emergency-recall` | Emergency capital recall (72h, auto-freeze) |
| POST | `/process-expired-votes` | Auto-yes/no for inactive shareholders |

### 4. Market (`/api/market/`) — 6 endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List market orders |
| POST | `/sell` | Create sell order (72h priority window) |
| POST | `/buy/:orderId` | Buy shares (priority check, board approval) |
| GET | `/stats/:projectId` | Market statistics |
| POST | `/match-orders` | FIFO order matching at AI price |
| POST | `/block-trade` | Block trade >5% (±10% negotiation) |
| GET | `/liquidity-reserve` | Liquidity reserve backstop status |

### 5. AI (`/api/ai/`) — 7 endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/feasibility` | AI feasibility analysis (HuggingFace, sector bonus, pitch bonus) |
| POST | `/valuation` | JOZOUR Valuation Algorithm v3.0 (7-step weighted) |
| POST | `/salary` | AI salary engine (Base×Tier×Perf×Region×Profit) |
| POST | `/reputation` | Reputation scoring (investor/founder/board) |
| POST | `/risk-assessment` | Risk prediction (5 categories) |
| POST | `/fundamental-price` | Fundamental share pricing (EPS×P/E×Growth+NAV) |
| POST | `/tax-calculate` | Tax calculator (corporate/VAT/dividend withholding) |

### 6. Dashboard (`/api/dashboard/`) — 8 endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/investor` | Investor dashboard (portfolio, ROI, votes, dividends) |
| GET | `/founder` | Founder dashboard (projects, milestones, salary, escrow) |
| GET | `/manager` | Manager dashboard (managed projects, pending transactions) |
| GET | `/law-firm` | Law firm portal (escrow, notarizations, disputes) |
| GET | `/regulator` | FRA shadow mode (aggregated, no PII) |
| GET | `/accountant` | Accountant dashboard (dual-sig, salary review, tax) |
| GET | `/platform-stats` | Public platform statistics |

### 7. Admin (`/api/admin/`) — 6 endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users (pagination, role/status filter) |
| POST | `/users/:id/kyc` | Approve/reject KYC |
| GET | `/projects` | All projects with alerts |
| POST | `/projects/:id/assign-lawfirm` | Assign law firm |
| POST | `/projects/:id/freeze` | Emergency freeze (escrow halt, red alert) |
| GET | `/audit-log` | Immutable audit log |
| GET | `/overview` | Platform-wide statistics |

### 8. Constitution (`/api/constitution/`) — 7 endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/rules` | Full constitutional rules (10 rules, fee model, tier rules) |
| GET | `/audit-chain` | Audit chain verification |
| GET | `/jozour-terms` | SHERKETI board term status |
| GET | `/employees/:projectId` | Employee registry (Add-on 3) |
| POST | `/employees` | Add employee (hiring-freeze trigger) |
| PUT | `/employees/:id` | Update employee |
| POST | `/whistleblower` | Anonymous whistleblower (AI-validated >70%) |

### 9. Add-ons (`/api/addons/`) — 14 endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/founder-priority/:orderId` | Founder priority buy-back (Add-on 4) |
| POST | `/dynamic-profit-share` | Dynamic profit-share ±5% (Add-on 7) |
| GET | `/insurance-vault` | Insurance vault status (Add-on 8) |
| POST | `/insurance-vault/claim` | Claim from vault (>40% revenue drop) |
| POST | `/matchmaking` | Founder-investor AI matchmaking (Add-on 10) |
| POST | `/bankruptcy-auction/trigger` | Bankruptcy reverse auction (Add-on 13) |
| POST | `/skill-barter/offer` | Register skill offer (Add-on 14) |
| GET | `/skill-barter/offers` | List skill offers |
| POST | `/skill-barter/:offerId/accept` | Accept skill barter |
| POST | `/gafi/register-company` | GAFI company registration (Add-on 15) |
| GET | `/gafi/compliance/:projectId` | GAFI compliance check |
| GET | `/gafi/incentives/:projectId` | GAFI investment incentives |
| POST | `/pitch-scoring` | Pitch deck/video scoring (Add-on 17) |
| POST | `/health-score` | Company health score (0-100) |
| POST | `/esg-score` | ESG/Impact scoring (Part XV) |
| POST | `/exit-readiness` | Exit readiness score (Part XIV) |
| POST | `/constitutional-amendment` | Constitutional amendment workflow |

### 10. Financial (`/api/financial/`) — 3 endpoints *(NEW in v3.3)*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/report/generate` | Auto-generate financial reports (quarterly/annual, notarized) |
| POST | `/dividend/distribute` | Dividend distribution via escrow (10% tax withholding) |
| GET | `/dashboard/:projectId` | Real-time financial dashboard (cash flow, burn rate, runway) |

### 11. Board Operations (`/api/board-ops/`) — 8 endpoints *(NEW in v3.3)*
| Method | Path | Description |
|--------|------|-------------|
| GET | `/meetings/:projectId` | Board meeting status (quarterly overdue check) |
| POST | `/meetings/schedule` | Schedule meeting with AI-prepared agenda |
| POST | `/meetings/minutes` | Record notarized meeting minutes |
| POST | `/performance-evaluation` | Annual board member performance evaluation |
| POST | `/contract/review` | Contract management (AI compliance score 0-100) |
| POST | `/reputation/global` | Global reputation (multi-role synergy, tenure bonus) |
| GET | `/law-firm-performance/:id` | Law firm performance index (SLA, notarization, disputes) |
| POST | `/early-warning` | Early warning system (yellow/red alerts, auto-freeze) |
| POST | `/employee-equity-conversion` | Employee compensation-to-equity (10% max, 15% discount) |
| POST | `/dispute-prediction` | AI dispute prediction (conflict risk 0-100) |
| POST | `/market-intelligence` | AI market intelligence (sector benchmarks) |
| GET | `/liquidity-dashboard/:projectId` | Liquidity dashboard (price history, market depth) |

---

## All 17 Add-ons — Status: Active
| # | Add-on | Status | Endpoint |
|---|--------|--------|----------|
| 1 | Fundamental-Only Share Pricing | Active | `/api/ai/fundamental-price` |
| 3 | Employee Registry | Active | `/api/constitution/employees` |
| 4 | Founder Priority Share Purchase | Active | `/api/addons/founder-priority` |
| 7 | Dynamic Profit-Share Tiers | Active | `/api/addons/dynamic-profit-share` |
| 8 | Anti-Fragility Insurance Vault | Active | `/api/addons/insurance-vault` |
| 10 | Founder-Investor AI Matchmaking | Active | `/api/addons/matchmaking` |
| 13 | Bankruptcy Reverse Auction | Active | `/api/addons/bankruptcy-auction` |
| 14 | Cross-Project Skill Barter | Active | `/api/addons/skill-barter` |
| 15 | GAFI API Integration | Active | `/api/addons/gafi` |
| 16 | Founder-Limited Partners | Active | `/api/projects` (built-in) |
| 17 | Pitch Decks & Videos | Active | `/api/addons/pitch-scoring` |

---

## 23 AI Modules
Feasibility, Valuation (JOZOUR v3), Salary Engine, Fraud Detection, Risk Prediction, Reputation (Investor/Founder/Board/Global), Health Scoring, Tax Automation, Fundamental Pricing, Board Term Tracker, Partner Limitation, Dispute Prediction, Market Intelligence, Bankruptcy Auction, Skill Barter Valuation, Financial Reporting, Board Agenda, Board Performance Evaluation, Contract Compliance, Law Firm Performance, Early Warning System, Employee Health Score, Matchmaking AI.

---

## Tech Stack
- **Backend:** Hono framework on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Frontend:** Vanilla JS + Tailwind CSS (CDN)
- **AI:** HuggingFace API integration (with fallback scoring)
- **Deployment:** Cloudflare Pages
- **Version Control:** Git + GitHub

## Data Architecture
- **15 database tables** with full referential integrity
- **Immutable audit log** with hash chains (append-only)
- **Role-based access** (admin, founder, investor, manager, accountant, law_firm, regulator)
- **Tier system** (A: Seed, B: Growth, C: Expert, D: Expansion)

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sherketi.com | admin123 |
| Law Firm | lawfirm@sherketi.com | admin123 |
| Founder | ahmed@sherketi.com | admin123 |
| Investor | sara@sherketi.com | admin123 |
| Accountant | khaled@sherketi.com | admin123 |

---

**Last Updated:** 2026-04-17 | **Blueprint:** v3.1 | **Gaps Remaining:** 0
