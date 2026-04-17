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

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', platform: 'SHERKETI', version: '3.3.0', blueprint: 'v3.1 — 10 Constitutional Rules — ALL Phases Complete — 0 Gaps', fee_model: '2.5% cash + 2.5% equity ALL tiers (A/B/C/D) + 5yr board seat + veto', add_ons: [1,3,4,7,8,10,13,14,15,16,17], total_api_routes: 'auth(5) + projects(7) + governance(14) + market(6) + ai(7) + dashboard(8) + admin(6) + constitution(7) + addons(14) + financial(3) + board-ops(8)', new_in_v3_3: ['financial reporting', 'dividend distribution w/ tax', 'board meetings & AI agendas', 'board performance evaluation', 'contract management', 'global reputation scoring', 'law-firm performance index', 'early warning system', 'employee equity conversion', 'dispute prediction', 'market intelligence', 'liquidity dashboard'] }))

// Main SPA - serves the frontend
app.get('*', (c) => {
  return c.html(renderPage())
})

export default app
