import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { projectRoutes } from './routes/projects'
import { governanceRoutes } from './routes/governance'
import { marketRoutes } from './routes/market'
import { aiRoutes } from './routes/ai'
import { dashboardRoutes } from './routes/dashboard'
import { adminRoutes } from './routes/admin'
import { constitutionRoutes } from './routes/constitution'
import { addonRoutes } from './routes/addons'
import { financialRoutes } from './routes/financial'
import { boardOpsRoutes } from './routes/board-ops'
import { exitRoutes } from './routes/exit'
import { esgRoutes } from './routes/esg'
import { industryRoutes } from './routes/industry'
import { academyRoutes } from './routes/academy'
import { regulatorRoutes } from './routes/regulator'
import { renderPage } from './utils/renderer'

type Bindings = {
  DB: D1Database
  HF_API_KEY: string
  PLATFORM_NAME: string
}

export type AppType = { Bindings: Bindings }

const app = new Hono<AppType>()

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// API Routes
app.route('/api/auth', authRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api/governance', governanceRoutes)
app.route('/api/market', marketRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/constitution', constitutionRoutes)
app.route('/api/addons', addonRoutes)
app.route('/api/financial', financialRoutes)
app.route('/api/board-ops', boardOpsRoutes)
app.route('/api/exit', exitRoutes)
app.route('/api/esg', esgRoutes)
app.route('/api/industry', industryRoutes)
app.route('/api/academy', academyRoutes)
app.route('/api/regulator', regulatorRoutes)

// Health check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  platform: 'SHERKETI',
  version: '3.4.0',
  blueprint: 'v3.1 — 10 Constitutional Rules — ALL 23 Parts Complete — 0 Gaps',
  fee_model: '2.5% cash + 2.5% equity ALL tiers (A/B/C/D) + 5yr board seat + veto',
  add_ons: [1,3,4,7,8,10,13,14,15,16,17],
  total_api_routes: {
    auth: 7, projects: 7, governance: 21, market: 14, ai: 14,
    dashboard: 8, admin: 6, constitution: 7, addons: 14, financial: 10,
    'board-ops': 8, exit: 4, esg: 4, industry: 3, academy: 8, regulator: 7,
    total: 142
  },
  gap_closure_v3_4: [
    'Part XIV: Exit Pathways & IPO Prep (exit-readiness, IPO prep, M&A readiness, MBO plans)',
    'Part XV: ESG & Impact (environmental/social/governance scoring, SDG alignment, green certification)',
    'Part XVI: Industry Modules (agriculture, manufacturing, tourism, technology sector tools)',
    'Part XVII: SHERKETI Academy (certifications, resources, investment clubs, events)',
    'Part XIX: Regulator/Compliance (FRA dashboard, EGX alignment, GAFI bidirectional sync, tax filing)',
    'Part III: Enhanced Auth (AI liveness detection, fraud pattern recognition, biometric fingerprinting)',
    'Part XI: Enhanced Market (price locks 24h, ±5%/10% price bands, liquidity backstop, soft pledges, reservations)',
    'Part VIII: Enhanced Governance (proxy voting, digital notarization, quorum extension 24h)',
    'Part IX: Enhanced Financial (contract management, dividend records with tax, Form 41 generation)',
    'Part X: Enhanced AI (Corporate Brain, Fraud Detection, Daily Health Score, Matchmaking AI profiles)'
  ],
  constitutional_hash: '0x9b7e5a2d1f4c8e3a6b9d2f7c4e1a8b3d5f6c2a9e'
}))

// Main SPA - serves the frontend
app.get('*', (c) => {
  return c.html(renderPage())
})

export default app
