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

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', platform: 'SHERKETI', version: '2.0.0', jozour_model: '2.5% commission + 2.5% equity + 5yr board (A/B/C)' }))

// Main SPA - serves the frontend
app.get('*', (c) => {
  return c.html(renderPage())
})

export default app
