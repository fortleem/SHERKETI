# SHERKETI v3.2.0 — AI-Governed Equity Crowdfunding Platform

## Blueprint v3.1 Comprehensive Edition — All Phases Implemented

**Constitutional Hash:** `0x9b7e5a2d1f4c8e3a6b9d2f7c4e1a8b3d5f6c2a9e`  
**Version:** 3.2.0  
**GitHub:** https://github.com/fortleem/SHERKETI  
**Founding Principle:** "Democratizing ownership, enforcing fairness, building Egypt's future--one constitutional share at a time."

## Platform Fee Model (Rule #8)

| Component | Tier A | Tier B | Tier C | Tier D |
|-----------|--------|--------|--------|--------|
| **Cash Commission** | 2.5% | 2.5% | 2.5% | 2.5% |
| **Equity Stake** | 2.5% | 2.5% | 2.5% | 2.5% |
| **Board Seat** | 5yr + Veto | 5yr + Veto | 5yr + Veto | 5yr + Veto |
| **Renewal** | 90-day ballot | 90-day ballot | 90-day ballot | 90-day ballot |

### 6 Veto Categories
1. Zero-custody rule changes
2. Non-approved escrow firms
3. Egyptian law violations
4. Asset sale >50% without shareholder vote
5. SHERKETI equity dilution without compensation
6. Platform removal (requires 90% shareholder vote)

**No veto on:** Day-to-day ops, hiring/firing, normal expenses, dividends, manager removal

## 10 Constitutional Rules
1. **Zero Custody** -- Platform never holds funds
2. **Escrow-Only** -- Licensed law-firm accounts
3. **AI-Locked Governance** -- Immutable algorithms
4. **Human-Proof Enforcement** -- No override capability
5. **Immutable Auditability** -- Hash-chained ledger
6. **One Identity** -- One government ID = one account
7. **Transparency Mandate** -- Public rules (only amendable rule: 75%+90d+law review)
8. **Platform Fee Model** -- 2.5% cash + 2.5% equity ALL tiers + 5yr board seat
9. **Fundamental-Only Share Pricing** -- AI intrinsic value; Price = (EPS x P/E x Growth) + (NAV x 0.3)
10. **Founder Partner Limitation** -- Investor cap + AI min investment = Goal / (Cap x 0.7)

## Complete API Reference (73+ endpoints across 9 route modules)

### Auth Routes (`/api/auth/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user with KYC |
| POST | `/login` | Authenticate user |
| GET | `/me` | Get current user profile |
| POST | `/kyc/submit` | Submit KYC documents |
| POST | `/kyc/auto-approve` | Auto-approve KYC (demo) |

### Project Routes (`/api/projects/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List projects (filter: status, tier, sector) |
| GET | `/:id` | Full project detail with shareholders, board, milestones, escrow |
| POST | `/` | Create project proposal (auto-calculates SHERKETI fee, founder rules, investor cap) |
| POST | `/:id/submit-review` | Submit for AI feasibility review (Gemma-2 scoring) |
| POST | `/:id/interest` | Express interest / soft pledge (14-day phase) |
| POST | `/:id/invest` | Invest in live fundraising (auto-creates SHERKETI equity + board on full funding) |
| POST | `/:id/go-live` | Start live fundraising (requires 30% pledge threshold or 500 votes) |
| GET | `/:id/milestones` | Get project milestones |
| POST | `/:id/milestones/:milestoneId/complete` | Complete milestone |

### Governance Routes (`/api/governance/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/votes/:projectId` | List votes for project |
| POST | `/votes` | Create vote/proposal (48h deadline, quorum 51%) |
| POST | `/votes/:voteId/cast` | Cast vote (includes SHERKETI veto check) |
| POST | `/votes/:voteId/veto` | SHERKETI veto (admin only, 6 categories) |
| POST | `/check-jozour-terms` | Auto-trigger retention votes (90 days before term end) |
| POST | `/manager-removal` | **NEW** Manager removal protocol (Part VIII.4) |
| POST | `/emergency-recall` | **NEW** Emergency capital recall 72h vote (Part VII.3) |
| POST | `/process-expired-votes` | **NEW** Auto-yes for inactive shareholders (Part VIII.2) |
| POST | `/milestone-release` | Request milestone escrow release (dual-sig for >1%) |
| POST | `/escrow/:id/sign` | Accountant dual-signature |
| POST | `/disputes` | File dispute (48h AI mediation) |
| GET | `/disputes/:projectId` | Get disputes |
| GET | `/events/:projectId` | Governance events log |
| GET | `/board/:projectId` | Board members |
| GET | `/notifications` | User notifications |
| POST | `/notifications/:id/read` | Mark notification read |
| POST | `/notifications/read-all` | Mark all read |

### Market Routes (`/api/market/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List market orders |
| POST | `/sell` | Create sell order (72h priority window for existing shareholders) |
| POST | `/buy/:orderId` | Buy shares (priority window enforcement + board approval) |
| GET | `/stats/:projectId` | Market statistics |
| POST | `/match-orders` | **NEW** FIFO order matching at AI fundamental price (Part XI.3) |
| POST | `/block-trade` | **NEW** Block trade >5% shares with +/-10% price negotiation |
| GET | `/liquidity-reserve` | **NEW** Liquidity backstop reserve status |

### AI Routes (`/api/ai/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/feasibility` | AI feasibility scoring (0-100) + **pitch bonus** (Add-on 17) |
| POST | `/valuation` | SHERKETI Valuation Algorithm v3.0 (7-step weighted blend) |
| POST | `/salary` | AI salary calculation + **200% override threshold** (Part IX.2) |
| POST | `/reputation` | Reputation scoring (investor/founder/board member) |
| POST | `/risk-assessment` | 5-category risk prediction |
| POST | `/fundamental-price` | Fundamental share pricing: (EPS x P/E x Growth) + (NAV x 0.3) |
| POST | `/tax-calculate` | Egyptian tax: capital gains (14%/22.5%), dividend (10%), VAT (14%) |

### Dashboard Routes (`/api/dashboard/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/investor` | Investor portfolio, votes, dividends, market opportunities |
| GET | `/founder` | Founder projects, milestones, salary, escrow, board |
| GET | `/manager` | Manager projects, pending transactions, salary records |
| GET | `/law-firm` | Law firm escrow, notarizations, disputes |
| GET | `/accountant` | **NEW** Dual-sig transactions, salary review, tax records, alerts |
| GET | `/regulator` | FRA shadow mode (aggregated stats, no PII) |
| GET | `/platform-stats` | Public platform statistics |

### Admin Routes (`/api/admin/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users (pagination, filter by role/status) |
| POST | `/users/:id/kyc` | Approve/reject KYC |
| GET | `/projects` | All projects with founder details |
| POST | `/projects/:id/assign-lawfirm` | Assign law firm |
| POST | `/projects/:id/freeze` | Emergency freeze (escrow halt + red alert) |
| GET | `/audit-log` | Immutable audit log |
| GET | `/overview` | Platform overview stats |

### Constitution Routes (`/api/constitution/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/rules` | 10 constitutional rules + fee model + tier rules + governance |
| GET | `/audit-chain` | Audit chain verification (hash integrity) |
| GET | `/jozour-terms` | SHERKETI board term status per project |
| GET | `/employees/:projectId` | Employee registry (Add-on 3) |
| POST | `/employees` | **NEW** Add employee (with hiring freeze trigger) |
| PUT | `/employees/:id` | **NEW** Update employee record |
| POST | `/whistleblower` | **NEW** Anonymous whistleblower channel (Appendix E) |

### Add-ons Routes (`/api/addons/`) -- **NEW MODULE**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/founder-priority/:orderId` | **Add-on 4:** Founder 72h buyback at AI price |
| POST | `/dynamic-profit-share` | **Add-on 7:** Annual profit-share adjustment (+/-5%) |
| GET | `/insurance-vault` | **Add-on 8:** Vault balance and rules |
| POST | `/insurance-vault/claim` | **Add-on 8:** Claim from vault (>40% revenue drop) |
| POST | `/matchmaking` | **Add-on 10:** AI compatibility scoring (0-100) |
| POST | `/bankruptcy-auction/trigger` | **Add-on 13:** Trigger reverse auction (health<20) |
| POST | `/skill-barter/offer` | **Add-on 14:** Register skill offer (credits issued) |
| GET | `/skill-barter/offers` | **Add-on 14:** Browse available skill offers |
| POST | `/skill-barter/:offerId/accept` | **Add-on 14:** Accept skill offer (1% fee burned) |
| POST | `/gafi/register-company` | **Add-on 15:** GAFI company registration stub |
| GET | `/gafi/compliance/:projectId` | **Add-on 15:** GAFI compliance check |
| GET | `/gafi/incentives/:projectId` | **Add-on 15:** GAFI investment incentives |
| POST | `/pitch-scoring` | **Add-on 17:** Pitch deck/video score bonus (max +15) |
| POST | `/health-score` | Company health score 0-100 (Part X.4) |
| POST | `/esg-score` | ESG/Impact scoring + SDG alignment (Part XV) |
| POST | `/exit-readiness` | Exit readiness assessment (Part XIV) |
| POST | `/constitutional-amendment` | Amendment workflow: 75% + 90d cooling (Part I.3) |

## Data Architecture

### Storage: Cloudflare D1 (SQLite)
- **17 tables:** users, projects, shareholdings, board_members, governance_events, votes, vote_records, escrow_transactions, milestones, market_orders, disputes, notifications, audit_log, risk_alerts, salary_records, tax_records, employee_registry, insurance_vault, skill_barter
- **Add-on tables:** employee_registry, insurance_vault, skill_barter

### Implemented Add-ons (11 of 17)
| # | Add-on | Status |
|---|--------|--------|
| 1 | Fundamental-Only Share Pricing | Active |
| 3 | Employee Registry with Position & Role | Active |
| 4 | Founder Priority Share Purchase | Active |
| 7 | Dynamic Profit-Share Tiers | Active |
| 8 | Anti-Fragility Insurance Vault | Active |
| 10 | Founder-Investor AI Matchmaking | Active |
| 13 | Bankruptcy Reverse Auction | Active |
| 14 | Cross-Project Skill Barter Exchange | Active |
| 15 | GAFI API Integration (stubs) | Active |
| 16 | Founder-Limited Partners & AI Minimum | Active |
| 17 | Pitch Decks & Videos (Score Boost) | Active |

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin/SHERKETI | admin@sherketi.com | admin123 |
| Founder | ahmed@techstartup.com | admin123 |
| Investor | sara@gmail.com | admin123 |
| Manager | manager@sherketi.com | admin123 |
| Accountant | accountant@audit.com | admin123 |
| Law Firm | lawfirm@elmasry-law.com | admin123 |
| Regulator | regulator@fra.gov.eg | admin123 |
| Founder 2 | layla@food.com | admin123 |

## Demo Projects
| # | Project | Tier | Status | Funding |
|---|---------|------|--------|---------|
| 1 | NileTech Solutions | B | Live Fundraising | 2.75M/5M EGP |
| 2 | Koshary Kings | A | Interest Phase | 0/2M EGP |
| 3 | SolarNile Energy | C | Active | 25M/25M EGP |
| 4 | Nile Brew Cafe | D | Live Fundraising | 8M/15M EGP |

## Tech Stack
- **Backend:** Hono (TypeScript) on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Frontend:** Vanilla JS + Tailwind CSS
- **Build:** Vite + Wrangler
- **AI:** HuggingFace API (Zephyr-7B-Beta for feasibility analysis)

## Pending Future Work
- Production Cloudflare Pages deployment
- Real zero-custody escrow flow with law firm API
- Full KYC/AML & sanctions screening integration
- Hugging Face Gemma-2 27B inference (currently uses Zephyr fallback)
- GAFI API production endpoints (currently stubs)
- Real-time notification channels (email/SMS/WhatsApp via Brevo/Twilio)
- Blockchain-based immutable ledger (currently append-only SQL)
- ERP integration connectors (QuickBooks, Zoho, Sage)
- Mobile app (iOS/Android)
- Quantum-resistant cryptography foundation

## Deployment
- **Platform:** Cloudflare Workers (Hono framework)
- **Status:** Development sandbox active
- **Last Updated:** 2026-04-16
