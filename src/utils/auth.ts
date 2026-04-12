// Simple hash function for passwords (Web Crypto API compatible)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

// Simple JWT-like token (base64 encoded JSON with expiry)
export function generateToken(userId: number, role: string): string {
  const payload = {
    uid: userId,
    role: role,
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    iat: Date.now()
  }
  return btoa(JSON.stringify(payload))
}

export function verifyToken(token: string): { uid: number, role: string } | null {
  try {
    const payload = JSON.parse(atob(token))
    if (payload.exp < Date.now()) return null
    return { uid: payload.uid, role: payload.role }
  } catch {
    return null
  }
}

// Generate deterministic hash for audit log
export async function generateAuditHash(data: string, previousHash: string = ''): Promise<string> {
  const encoder = new TextEncoder()
  const combined = previousHash + data + Date.now().toString()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combined))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Audit logger - append only
export async function logAudit(db: D1Database, action: string, entityType: string, entityId: number, actorId: number | null, details: string, aiModel?: string) {
  const lastEntry = await db.prepare('SELECT output_hash FROM audit_log ORDER BY id DESC LIMIT 1').first<{output_hash: string}>()
  const previousHash = lastEntry?.output_hash || 'genesis'
  const outputHash = await generateAuditHash(`${action}:${entityType}:${entityId}:${details}`, previousHash)
  
  await db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details, ai_model, rule_version, output_hash, previous_hash)
    VALUES (?, ?, ?, ?, ?, ?, 'v1.0', ?, ?)
  `).bind(actorId, action, entityType, entityId, details, aiModel || null, outputHash, previousHash).run()
}
