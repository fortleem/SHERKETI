# SHERKETI - AI-Governed Equity Crowdfunding Platform

## 🇪🇬 شركتي - منصة التمويل الجماعي المحوكمة بالذكاء الاصطناعي

## Project Overview
- **Name**: SHERKETI (شركتي)
- **Goal**: World's first constitutionally governed, AI-enforced equity crowdfunding platform for the Egyptian market
- **Stack**: Hono + TypeScript + Cloudflare Workers + D1 Database + TailwindCSS + HuggingFace AI

## Live URLs
- **Platform**: [SHERKETI Platform](https://3000-ie030y1bdkynon6vaywe9-b9b802c4.sandbox.novita.ai)
- **API Health**: `/api/health`
- **Constitution**: `/api/constitution/rules`

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sherketi.com | admin123 |
| Founder | ahmed@techstartup.com | admin123 |
| Investor (Sara) | sara@gmail.com | admin123 |
| Investor (Omar) | omar@gmail.com | admin123 |
| Investor (Fatma) | fatma@gmail.com | admin123 |

## Implemented Features

### 8 Immutable Constitutional Rules
1. **Zero Custody** - Platform never holds funds
2. **Escrow-Only Flow** - Licensed law-firm escrow accounts
3. **AI-Locked Governance** - Immutable AI governance rules
4. **Human-Proof Enforcement** - No override capability
5. **Immutable Auditability** - Hash-chained append-only ledger
6. **One Identity Rule** - One government ID = one account
7. **Transparency Mandate** - Public constitutional rules
8. **Platform Neutrality** - Equity-only fees (2.5%-5%)

### Core Modules
- **Identity & KYC/AML System**: Registration, verification, AI liveness detection, sanctions screening, One Identity Rule enforcement
- **Project & Tier Engine**: 4-tier system (A/B/C/D), AI feasibility scoring, automated tier assignment
- **AI Governance Engine**: Feasibility AI, JOZOUR Valuation v3.0, Salary Engine, Risk Prediction, Reputation Scoring
- **Voting & Board Service**: Share-based voting, 48h windows, quorum tracking, auto-yes for inactive shareholders, proxy voting
- **Escrow & Ledger Service**: Law-firm escrow workflow, milestone-based releases, dual-signature system, hash-chained audit log
- **Secondary Market**: Partner-first priority (72h), AI dynamic valuation, liquidity discount, board approval workflow
- **Tax Automation**: Egyptian capital gains (14%/22.5%), dividend withholding (10%), VAT (14%), Form 41 generation

### Dashboards
- **Investor Dashboard**: Portfolio tracking, pending votes, market opportunities, ROI calculations
- **Founder Dashboard**: Project management, milestone tracking, escrow overview, salary records
- **Admin Dashboard**: User management, project oversight, emergency freeze, audit log viewer
- **Law Firm Portal**: Escrow execution, notarization queue, assigned projects
- **FRA Regulatory Mode**: Read-only aggregated data, no PII exposed

### AI Engines (Using Free HuggingFace API)
1. **Feasibility AI**: Score 0-100, auto-reject <35, 30-day ban
2. **JOZOUR Valuation v3.0**: 5-component weighted blend (Revenue×Sector 40%, Net Assets 25%, Scorecard 20%, Growth 10%, Founder 5%)
3. **AI Salary Engine**: Base × Tier × Performance × Region × Profit
4. **Reputation Scoring**: Investor (6 metrics), Founder (6 metrics), Board (5 metrics)
5. **Risk Prediction**: 5-category (Governance, Financial, Operational, Compliance, Reputation)
6. **Tax Calculator**: Capital gains, dividends, VAT with ETA integration

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/kyc/submit` | Submit KYC documents |
| POST | `/api/auth/kyc/auto-approve` | Auto-approve KYC (demo) |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects (filterable) |
| GET | `/api/projects/:id` | Full project detail with cap table, board, milestones |
| POST | `/api/projects` | Create new project |
| POST | `/api/projects/:id/submit-review` | Submit for AI feasibility review |
| POST | `/api/projects/:id/interest` | Express interest (14-day phase) |
| POST | `/api/projects/:id/invest` | Invest in live project |
| POST | `/api/projects/:id/go-live` | Start live fundraising |

### Governance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/governance/votes/:projectId` | Get votes for project |
| POST | `/api/governance/votes` | Create new vote/proposal |
| POST | `/api/governance/votes/:id/cast` | Cast vote (for/against/abstain) |
| GET | `/api/governance/events/:projectId` | Governance event timeline |
| GET | `/api/governance/board/:projectId` | Board members |
| POST | `/api/governance/milestone-release` | Request milestone fund release |
| POST | `/api/governance/escrow/:id/sign` | Dual-signature approval |
| POST | `/api/governance/disputes` | File a dispute |
| GET | `/api/governance/notifications` | User notifications |

### Secondary Market
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/market/orders` | List market orders |
| POST | `/api/market/sell` | Create sell order (72h priority window) |
| POST | `/api/market/buy/:orderId` | Buy shares |
| GET | `/api/market/stats/:projectId` | Market statistics |

### AI Engine
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/feasibility` | AI feasibility analysis |
| POST | `/api/ai/valuation` | JOZOUR Valuation v3.0 |
| POST | `/api/ai/salary` | AI salary calculation |
| POST | `/api/ai/reputation` | Reputation score calculator |
| POST | `/api/ai/risk-assessment` | Risk prediction system |
| POST | `/api/ai/tax-calculate` | Egyptian tax calculator |

### Dashboard & Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/investor` | Investor dashboard data |
| GET | `/api/dashboard/founder` | Founder dashboard data |
| GET | `/api/dashboard/law-firm` | Law firm portal data |
| GET | `/api/dashboard/regulator` | FRA shadow mode (read-only) |
| GET | `/api/dashboard/platform-stats` | Public platform statistics |
| GET | `/api/admin/overview` | Admin overview |
| GET | `/api/admin/users` | Manage users |
| POST | `/api/admin/users/:id/kyc` | Approve/reject KYC |
| GET | `/api/admin/projects` | All projects |
| POST | `/api/admin/projects/:id/freeze` | Emergency freeze |
| GET | `/api/admin/audit-log` | Immutable audit log |

### Constitution
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/constitution/rules` | Public constitutional rules |
| GET | `/api/constitution/audit-chain` | Verify audit chain integrity |

## Data Architecture
- **Database**: Cloudflare D1 (SQLite) with 15 tables
- **Core Tables**: users, projects, shareholdings, board_members, governance_events, votes, vote_records, escrow_transactions, milestones, market_orders, disputes, notifications, audit_log, risk_alerts, salary_records, tax_records
- **Immutable Ledger**: Hash-chained append-only audit log (no UPDATE/DELETE)
- **Storage**: Zero-custody design — no fund storage capability exists in the platform

## Deployment
- **Platform**: Cloudflare Pages/Workers
- **Database**: Cloudflare D1 (local SQLite for dev)
- **AI**: HuggingFace Inference API (free tier)
- **Status**: ✅ Active
- **Last Updated**: 2026-04-12
