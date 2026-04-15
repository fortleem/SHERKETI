# SHERKETI — AI-Governed Equity Crowdfunding Platform

## Blueprint v3.1 Comprehensive Edition — 10 Constitutional Rules

**Constitutional Hash:** `0x9b7e5a2d1f4c8e3a6b9d2f7c4e1a8b3d5f6c2a9e`  
**Version:** 3.1.0  
**Founding Principle:** "Democratizing ownership, enforcing fairness, building Egypt's future—one constitutional share at a time."

## 🏗️ Platform Fee Model (Rule #8)

| Component | Tier A | Tier B | Tier C | Tier D |
|-----------|--------|--------|--------|--------|
| **Cash Commission** | 2.5% | 2.5% | 2.5% | 2.5% |
| **Equity Stake** | 2.5% | 2.5% | 2.5% | 2.5% |
| **Board Seat** | 5yr + Veto | 5yr + Veto | 5yr + Veto | 5yr + Veto |
| **Renewal** | 90-day ballot | 90-day ballot | 90-day ballot | 90-day ballot |

### 6 Veto Categories (Limited Scope)
1. Zero-custody rule changes
2. Non-approved escrow firms
3. Egyptian law violations
4. Asset sale >50% without shareholder vote
5. SHERKETI equity dilution without compensation
6. Platform removal (requires 90% shareholder vote)

**No veto on:** Day-to-day ops, hiring/firing, normal expenses, dividends, manager removal

## 📜 10 Constitutional Rules
1. **Zero Custody** — Platform never holds funds
2. **Escrow-Only** — Licensed law-firm accounts
3. **AI-Locked Governance** — Immutable algorithms
4. **Human-Proof** — No override capability
5. **Immutable Audit** — Hash-chained ledger
6. **One Identity** — One ID per account forever
7. **Transparency** — Public constitutional rules (75% amendable)
8. **Platform Fee** — 2.5% cash + 2.5% equity ALL tiers
9. **Fundamental-Only Pricing** — `Price = (EPS × P/E × Growth) + (NAV × 0.3)`
10. **Founder Partner Limitation** — `Min Investment = Goal / (Cap × 0.7)`

## 👤 Tier-Specific Founder Rules

| Aspect | Tier A | Tier B | Tier C | Tier D |
|--------|--------|--------|--------|--------|
| Founder Equity | 5% fixed | 5% → 10% | 10% + 25% vest | AI-determined |
| Dividend Bonus | +5% of profits | Pro-rata | 35% while manager | Pro-rata |
| Manager | BANNED | Electable | Default manager | Owner = Manager |

## 🔗 URLs
- **Live Platform:** [Sandbox URL]
- **GitHub:** https://github.com/fortleem/SHERKETI
- **Constitution API:** `/api/constitution/rules`
- **Health Check:** `/api/health`

## 🧪 Demo Accounts (Password: `admin123`)

| Account | Email | Role |
|---------|-------|------|
| SHERKETI Admin | admin@sherketi.com | Admin |
| Founder (Ahmed) | ahmed@techstartup.com | Founder |
| Founder (Layla) | layla@food.com | Founder |
| Investor (Sara) | sara@gmail.com | Investor |
| Investor (Omar) | omar@investment.com | Investor |
| Investor (Fatma) | fatma@gmail.com | Investor |
| Manager | manager@sherketi.com | Manager |
| Accountant | accountant@audit.com | Accountant |
| Law Firm | lawfirm@elmasry-law.com | Law Firm |
| FRA Regulator | regulator@fra.gov.eg | Regulator |

## 📊 Demo Projects

| Project | Tier | Status | Funding | Equity | Veto |
|---------|------|--------|---------|--------|------|
| NileTech Solutions | B | Live Fundraising | 2.75M/5M EGP | 2.5% | ✅ |
| Koshary Kings | A | Interest Phase | 0/2M EGP | 2.5% | ✅ |
| SolarNile Energy | C | Active | 25M/25M EGP | 2.5% | ✅ |
| Nile Brew Café | D | Live Fundraising | 8M/15M EGP | 2.5% | ✅ |

## 🧠 AI Modules
- **Feasibility AI** — Project viability scoring (0-100)
- **SHERKETI Valuation v3.0** — 7-step weighted blend
- **Fundamental Share Pricing** — Rule #9 engine
- **AI Salary Engine** — Performance-based compensation
- **Risk Prediction** — 5-category system
- **Reputation Scoring** — Investor/Founder/Board/Global
- **Tax Automation** — Egyptian ETA Form 41
- **Board Term Tracker** — 90-day auto-ballot trigger
- **Partner Limitation** — AI minimum calculator

## 🔌 Active Add-ons
- **#1** Fundamental-Only Share Pricing (Rule #9)
- **#3** Employee Registry with Key Person Tracking
- **#4** Founder Priority Share Purchase
- **#7** Dynamic Profit-Share Tiers
- **#8** Anti-Fragility Insurance Vault (0.5% of each raise)
- **#16** Founder Partner Limitation & AI Minimum
- **#17** Pitch Deck & Video Score Boost

## 🛠 Tech Stack
- **Backend:** Hono + TypeScript + Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Frontend:** Vanilla JS + TailwindCSS CDN
- **AI:** HuggingFace Inference API (Zephyr-7B)
- **Build:** Vite + Wrangler

## 📦 API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Platform health check |
| GET | `/api/constitution/rules` | 10 constitutional rules |
| GET | `/api/constitution/jozour-terms` | SHERKETI board terms |
| GET | `/api/constitution/audit-chain` | Audit chain verification |
| GET | `/api/constitution/employees/:projectId` | Employee registry |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Project details |
| GET | `/api/market/orders` | Secondary market listings |
| GET | `/api/dashboard/platform-stats` | Public platform stats |
| GET | `/api/dashboard/regulator` | FRA shadow mode |

### Authenticated
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/projects` | Create project (with investor_cap) |
| POST | `/api/projects/:id/invest` | Invest in project |
| POST | `/api/projects/:id/interest` | Express interest |
| POST | `/api/governance/votes` | Create vote |
| POST | `/api/governance/votes/:id/cast` | Cast vote |
| POST | `/api/governance/votes/:id/veto` | Exercise veto |
| POST | `/api/governance/check-jozour-terms` | Check expiring terms |
| POST | `/api/ai/valuation` | AI valuation calculator |
| POST | `/api/ai/fundamental-price` | Fundamental pricing |
| POST | `/api/ai/salary` | Salary calculator |
| POST | `/api/ai/reputation` | Reputation calculator |
| POST | `/api/ai/risk-assessment` | Risk assessment |
| POST | `/api/ai/tax-calculate` | Tax calculator |

## 🚀 Deployment
- **Platform:** Cloudflare Pages
- **Status:** ✅ Active (Development)
- **Last Updated:** 2026-04-15
