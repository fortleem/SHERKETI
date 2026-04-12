# SHERKETI - AI-Governed Equity Crowdfunding Platform

> **شركتي** — The world's first constitutionally governed equity crowdfunding platform for Egypt

## Live Demo
**Platform URL**: [https://3000-ie030y1bdkynon6vaywe9-b9b802c4.sandbox.novita.ai](https://3000-ie030y1bdkynon6vaywe9-b9b802c4.sandbox.novita.ai)

## JOZOUR Fee Model (v2.0)

| | Tier A | Tier B | Tier C | Tier D |
|---|---|---|---|---|
| **Cash Commission** | 2.5% | 2.5% | 2.5% | 2.5% |
| **Equity Stake** | 2.5% | 2.5% | 2.5% | 0% |
| **Board Seat** | 5yr + Veto | 5yr + Veto | 5yr + Veto | None |
| **Max Raise** | 3M EGP | 25M EGP | Unlimited | Unlimited |
| **After 5 Years** | Shareholder vote | Shareholder vote | Shareholder vote | N/A |

- If voted out after 5 years: equity retained, board seat + veto removed
- JOZOUR veto is limited to illegal/unconstitutional actions only

## Demo Accounts (password: `admin123`)

| Role | Email | Description |
|---|---|---|
| Admin/JOZOUR | admin@sherketi.com | Platform admin with veto power |
| Founder | ahmed@techstartup.com | Project creator |
| Investor | sara@gmail.com | Equity investor |
| Manager | manager@sherketi.com | Operations manager |
| Accountant | accountant@audit.com | Independent accountant (dual-sig) |
| Law Firm | lawfirm@elmasry-law.com | Escrow & notarization |
| Regulator | regulator@fra.gov.eg | FRA shadow mode (read-only) |

## Features

### Constitutional Rules (8 Immutable)
1. Zero Custody — Platform never holds funds
2. Escrow-Only Capital Flow — Licensed law-firm accounts
3. AI-Locked Governance — No manual overrides
4. Human-Proof Enforcement — AI validation required
5. Immutable Auditability — Hash-chained ledger
6. One Identity Rule — One ID per account forever
7. Transparency Mandate — Public rules
8. JOZOUR Dual Compensation — 2.5% commission + 2.5% equity

### AI Engines (6 modules)
- **Feasibility AI** — Scores projects 0-100 (HuggingFace Zephyr-7B)
- **JOZOUR Valuation v3.0** — Weighted blend (revenue/assets/scorecard/growth/founder)
- **Salary Engine** — Base x Tier x Performance x Region x Profit
- **Reputation Scoring** — Investor/Founder/Board formulas
- **Risk Prediction** — 5-category assessment
- **Tax Calculator** — Egyptian ETA integration (Form 41)

### Dashboards (7 roles)
- **Investor**: Portfolio, voting, market opportunities, dividends
- **Founder**: Projects, milestones, escrow overview, board members
- **Manager**: Operations, pending transactions, salary records
- **Law Firm**: Escrow execution, notarizations, dispute arbitration
- **Admin/JOZOUR**: User management, project oversight, JOZOUR terms tracker
- **FRA Regulator**: Shadow mode (aggregated data, no PII)
- **Public**: Constitution viewer, project explorer

### Governance
- 1 share = 1 vote
- 51% quorum, >50% majority, 75% for constitutional amendments
- 48-hour voting windows with auto-yes for inactive shareholders
- Dual signature for transactions >1% capital
- Full board vote for transactions >10% capital
- JOZOUR veto on illegal/unconstitutional actions

### End-to-End Workflow
1. **Register** → KYC verification (AI liveness + OCR)
2. **Create Project** → AI feasibility review (score < 35 = auto-reject)
3. **Interest Phase** → 14 days, need 30% pledges or 500 votes
4. **Live Fundraising** → Min investment 50 EGP, 48h share reservation
5. **Funded** → JOZOUR commission deducted, equity + board seat created
6. **Milestones** → Tranche releases via escrow with dual-sig/board approval
7. **Governance** → Quarterly reports, voting, dividend distribution
8. **Secondary Market** → 72h partner-first, AI dynamic valuation

## Tech Stack (100% Free)
- **Backend**: Hono + TypeScript on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) — 16 tables
- **AI**: HuggingFace Inference API (free tier)
- **Frontend**: Vanilla JS SPA + TailwindCSS CDN
- **Fonts**: Inter + Cairo (Arabic support)
- **Icons**: FontAwesome 6

## API Endpoints (40+)

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user profile
- `POST /api/auth/kyc/submit` — Submit KYC docs
- `POST /api/auth/kyc/auto-approve` — Demo auto-verify

### Projects
- `GET /api/projects` — List projects (filter by status/tier/sector)
- `GET /api/projects/:id` — Full project details
- `POST /api/projects` — Create project proposal
- `POST /api/projects/:id/submit-review` — AI feasibility review
- `POST /api/projects/:id/interest` — Express interest
- `POST /api/projects/:id/invest` — Invest in live project
- `POST /api/projects/:id/go-live` — Start live fundraising

### Governance
- `GET /api/governance/votes/:projectId` — Get votes
- `POST /api/governance/votes` — Create proposal
- `POST /api/governance/votes/:id/cast` — Cast vote
- `POST /api/governance/votes/:id/veto` — JOZOUR veto
- `POST /api/governance/check-jozour-terms` — Check expiring terms
- `POST /api/governance/milestone-release` — Request fund release
- `POST /api/governance/escrow/:id/sign` — Dual signature
- `POST /api/governance/disputes` — File dispute

### AI
- `POST /api/ai/feasibility` — AI project scoring
- `POST /api/ai/valuation` — JOZOUR Valuation v3.0
- `POST /api/ai/salary` — Salary calculation
- `POST /api/ai/reputation` — Reputation scoring
- `POST /api/ai/risk-assessment` — Risk prediction
- `POST /api/ai/tax-calculate` — Tax calculation

### Constitution
- `GET /api/constitution/rules` — Full constitution
- `GET /api/constitution/audit-chain` — Verify audit chain
- `GET /api/constitution/jozour-terms` — JOZOUR board terms

## Setup

```bash
npm install
npm run db:migrate:local
npm run db:seed
npm run build
npm run preview
```

Add your HuggingFace API key to `.dev.vars`:
```
HF_API_KEY=your_key_here
```

## GitHub
- **Repository**: https://github.com/fortleem/SHERKETI

## Status
- **Platform**: Cloudflare Workers (D1 local)
- **Version**: 2.0.0
- **Last Updated**: 2026-04-12
