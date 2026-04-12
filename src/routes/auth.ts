import { Hono } from 'hono'
import type { AppType } from '../index'
import { hashPassword, verifyPassword, generateToken, logAudit } from '../utils/auth'

export const authRoutes = new Hono<AppType>()

// Register
authRoutes.post('/register', async (c) => {
  const body = await c.req.json()
  const { email, password, full_name, full_name_ar, user_type, role, national_id, passport_number, phone, region } = body

  if (!email || !password || !full_name || !user_type) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  if (national_id) {
    const existingNID = await c.env.DB.prepare('SELECT id FROM users WHERE national_id = ?').bind(national_id).first()
    if (existingNID) return c.json({ error: 'National ID already registered. One Identity Rule: One government-issued ID = one account permanently.' }, 409)
  }

  const password_hash = await hashPassword(password)
  const result = await c.env.DB.prepare(`
    INSERT INTO users (email, password_hash, full_name, full_name_ar, user_type, role, national_id, passport_number, phone, region, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(email, password_hash, full_name, full_name_ar || null, user_type, role || 'investor', national_id || null, passport_number || null, phone || null, region || 'cairo').run()

  const userId = result.meta.last_row_id
  await logAudit(c.env.DB, 'user_registered', 'user', userId as number, userId as number, JSON.stringify({ email, user_type, role: role || 'investor' }))

  const token = generateToken(userId as number, role || 'investor')
  return c.json({ success: true, token, userId, message: 'Registration successful. Please complete KYC verification.' })
})

// Login
authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>()
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  if (user.verification_status === 'banned') {
    return c.json({ error: 'Account banned', reason: user.ban_reason, until: user.ban_until }, 403)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

  await c.env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run()

  const token = generateToken(user.id, user.role)
  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      full_name_ar: user.full_name_ar,
      role: user.role,
      user_type: user.user_type,
      verification_status: user.verification_status,
      reputation_score: user.reputation_score,
      region: user.region,
      kyc_level: user.kyc_level
    }
  })
})

// Get current user profile
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const payload = verifyToken(token)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)

  const user = await c.env.DB.prepare(`
    SELECT id, email, full_name, full_name_ar, user_type, role, phone, verification_status, 
           kyc_level, aml_cleared, reputation_score, region, created_at, last_login,
           risk_profile, pep_status, sanctions_cleared
    FROM users WHERE id = ?
  `).bind(payload.uid).first()

  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ user })
})

// KYC Verification submit
authRoutes.post('/kyc/submit', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const payload = verifyToken(token)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const body = await c.req.json()
  const { national_id, passport_number, selfie_data, document_data, phone } = body

  // Simulate AI liveness detection and OCR
  const selfie_hash = selfie_data ? await hashPassword(selfie_data) : null
  const doc_hash = document_data ? await hashPassword(document_data) : null

  await c.env.DB.prepare(`
    UPDATE users SET 
      national_id = COALESCE(?, national_id),
      passport_number = COALESCE(?, passport_number),
      selfie_hash = COALESCE(?, selfie_hash),
      id_document_hash = COALESCE(?, id_document_hash),
      phone = COALESCE(?, phone),
      verification_status = 'under_review',
      kyc_level = 1
    WHERE id = ?
  `).bind(national_id || null, passport_number || null, selfie_hash, doc_hash, phone || null, payload.uid).run()

  await logAudit(c.env.DB, 'kyc_submitted', 'user', payload.uid, payload.uid, 'KYC documents submitted for review', 'ocr-liveness-v1')

  return c.json({ success: true, message: 'KYC documents submitted. Verification in progress (simulated: auto-approved in demo).' })
})

// KYC Auto-approve (demo mode)
authRoutes.post('/kyc/auto-approve', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const payload = verifyToken(token)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  await c.env.DB.prepare(`
    UPDATE users SET verification_status = 'verified', kyc_level = 2, aml_cleared = 1, sanctions_cleared = 1 WHERE id = ?
  `).bind(payload.uid).run()

  await logAudit(c.env.DB, 'kyc_approved', 'user', payload.uid, payload.uid, 'KYC auto-approved (demo mode)', 'kyc-auto-v1')

  return c.json({ success: true, message: 'KYC verified successfully (demo mode).' })
})
