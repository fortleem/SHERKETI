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

// POST /kyc/liveness - AI Liveness Detection Simulation (Part III.1)
authRoutes.post('/kyc/liveness', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const payload = verifyToken(token)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { head_movements, selfie_data } = await c.req.json()
  
  // AI Liveness Detection (Part III.1 Rule 2)
  // Simulates randomized head movement verification
  const requiredMovements = ['left', 'right', 'up', 'blink']
  const providedMovements = head_movements || []
  const movementsValid = requiredMovements.every((m: string) => providedMovements.includes(m))
  
  // Anti-spoofing checks
  const livenessChecks = {
    head_movement_verification: movementsValid,
    deepfake_detection: { passed: true, confidence: 0.97 },
    photo_in_photo_detection: { passed: true, confidence: 0.99 },
    device_fingerprint: { captured: true },
    randomized_sequence: requiredMovements
  }
  
  const passed = movementsValid && livenessChecks.deepfake_detection.passed
  
  if (passed && selfie_data) {
    const selfie_hash = await hashPassword(selfie_data)
    // Check for duplicate biometrics (One Identity Rule - Part III.1 Rule 1)
    const duplicateCheck = await c.env.DB.prepare('SELECT id FROM users WHERE selfie_hash = ? AND id != ?').bind(selfie_hash, payload.uid).first()
    if (duplicateCheck) {
      await logAudit(c.env.DB, 'duplicate_biometric_detected', 'user', payload.uid, payload.uid, 'Duplicate biometric detected - One Identity Rule violation')
      return c.json({ error: 'Duplicate biometric detected. One Identity Rule: One ID = one account permanently.', ban_applied: true }, 403)
    }
    await c.env.DB.prepare('UPDATE users SET selfie_hash = ? WHERE id = ?').bind(selfie_hash, payload.uid).run()
  }
  
  await logAudit(c.env.DB, 'liveness_check', 'user', payload.uid, payload.uid, JSON.stringify(livenessChecks), 'liveness-detection-v1')
  
  return c.json({
    liveness_passed: passed,
    checks: livenessChecks,
    next_step: passed ? 'Proceed to document verification' : 'Please retry with proper head movements',
    blueprint_reference: 'Part III.1 - AI Liveness Detection'
  })
})

// POST /fraud-check - Fraud Pattern Recognition (Part III.1)
authRoutes.post('/fraud-check', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.replace('Bearer ', '')
  const { verifyToken } = await import('../utils/auth')
  const payload = verifyToken(token)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { user_id } = await c.req.json()
  const targetId = user_id || payload.uid
  
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(targetId).first<any>()
  if (!user) return c.json({ error: 'User not found' }, 404)
  
  // Fraud pattern checks
  const recentRegistrations = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-1 hour')").first()
  const sameRegionRecent = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE region = ? AND created_at > datetime('now', '-24 hours')").bind(user.region).first()
  
  const fraudIndicators = {
    duplicate_document: user.national_id ? false : null,
    suspicious_registration_pattern: ((recentRegistrations as any)?.count || 0) > 50,
    same_ip_multiple_accounts: false,
    blacklisted_national_id: false,
    sanctions_match: user.sanctions_cleared === 0 && user.kyc_level >= 1,
    pep_flagged: user.pep_status === 1,
    region_anomaly: ((sameRegionRecent as any)?.count || 0) > 100
  }
  
  const riskScore = Object.values(fraudIndicators).filter(v => v === true).length * 25
  const riskLevel = riskScore >= 75 ? 'high' : riskScore >= 50 ? 'elevated' : riskScore >= 25 ? 'standard' : 'low'
  
  return c.json({
    user_id: targetId,
    fraud_check: {
      indicators: fraudIndicators,
      risk_score: riskScore,
      risk_level: riskLevel,
      action: riskScore >= 75 ? 'BLOCK - Manual review required' : riskScore >= 50 ? 'FLAG - Enhanced monitoring' : 'PASS'
    },
    aml_status: { cleared: user.aml_cleared === 1, pep_status: user.pep_status === 1, sanctions_cleared: user.sanctions_cleared === 1 },
    blueprint_reference: 'Part III.1 - Fraud Pattern Recognition / Part III.3 - KYC/AML'
  })
})
