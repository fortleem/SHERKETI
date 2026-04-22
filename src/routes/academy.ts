// SHERKETI ACADEMY - Part XVII Blueprint v3.1
// Certifications, Learning Resources, Community Features, Investment Clubs
import { Hono } from 'hono'
import { verifyToken, logAudit } from '../utils/auth'

export const academyRoutes = new Hono()

// GET /certifications - List available certification programs (Part XVII.1)
academyRoutes.get('/certifications', async (c) => {
  return c.json({
    certifications: [
      {
        type: 'first_time_investor',
        name: 'First-Time Investor Certification',
        name_ar: 'شهادة المستثمر المبتدئ',
        modules: 5,
        description: 'Basics of equity crowdfunding, risk assessment, platform navigation',
        prerequisite: 'None - open to all verified users',
        duration: '2-4 hours',
        benefits: ['Access to invest', 'Platform navigation guide', 'Risk assessment tools']
      },
      {
        type: 'founder_readiness',
        name: 'Founder Readiness Program',
        name_ar: 'برنامج جاهزية المؤسس',
        modules: 8,
        description: 'Business planning, financial modelling, pitch preparation, creating effective pitch decks/videos',
        prerequisite: 'Verified account',
        duration: '8-12 hours',
        benefits: ['Priority project review', '+5 feasibility bonus', 'Pitch template access']
      },
      {
        type: 'board_member_excellence',
        name: 'Board Member Excellence Course',
        name_ar: 'دورة التميز في عضوية مجلس الإدارة',
        modules: 6,
        description: 'Governance best practices, fiduciary duties, conflict resolution',
        prerequisite: 'Active board membership or >10% stake',
        duration: '6-10 hours',
        benefits: ['Priority in board elections', 'Enhanced governance analytics']
      },
      {
        type: 'company_manager',
        name: 'Company Manager Certification',
        name_ar: 'شهادة مدير الشركة',
        modules: 10,
        description: 'Financial controls, team leadership, milestone management',
        prerequisite: 'Manager role or Tier C/D founder',
        duration: '12-16 hours',
        benefits: ['Higher salary multiplier', 'Advanced dashboard access']
      },
      {
        type: 'advanced_governance',
        name: 'Advanced Governance Specialist',
        name_ar: 'أخصائي الحوكمة المتقدمة',
        modules: 7,
        description: 'Egyptian LLC law, constitutional rules, dispute resolution',
        prerequisite: 'Board Member Excellence completed',
        duration: '10-14 hours',
        benefits: ['Governance consulting rights', 'Featured in platform resources']
      },
      {
        type: 'esg_specialist',
        name: 'ESG & Sustainability Specialist',
        name_ar: 'أخصائي الاستدامة والحوكمة البيئية',
        modules: 6,
        description: 'Environmental scoring, impact measurement, green certification',
        prerequisite: 'Any active role',
        duration: '6-8 hours',
        benefits: ['ESG audit capability', 'Green certification reviewer']
      }
    ],
    blueprint_reference: 'Part XVII.1 - Certification Programs'
  })
})

// POST /enroll - Enroll in a certification program
academyRoutes.post('/enroll', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { certification_type } = await c.req.json()
  if (!certification_type) return c.json({ error: 'certification_type required' }, 400)
  
  const validTypes = ['first_time_investor', 'founder_readiness', 'board_member_excellence', 'company_manager', 'advanced_governance', 'esg_specialist']
  if (!validTypes.includes(certification_type)) return c.json({ error: 'Invalid certification type' }, 400)
  
  const moduleCount: Record<string, number> = { first_time_investor: 5, founder_readiness: 8, board_member_excellence: 6, company_manager: 10, advanced_governance: 7, esg_specialist: 6 }
  
  const { env } = c
  
  // Check if already enrolled
  const existing = await env.DB.prepare('SELECT * FROM academy_certifications WHERE user_id = ? AND certification_type = ? AND status IN (?,?)').bind(auth.uid, certification_type, 'enrolled', 'in_progress').first()
  if (existing) return c.json({ error: 'Already enrolled in this certification' }, 409)
  
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 2)
  
  await env.DB.prepare(`
    INSERT INTO academy_certifications (user_id, certification_type, total_modules, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(auth.uid, certification_type, moduleCount[certification_type], expiresAt.toISOString()).run()
  
  await logAudit(env.DB, 'academy_enrollment', 'certification', 0, auth.uid, JSON.stringify({ certification_type }))
  
  return c.json({
    message: 'Successfully enrolled',
    certification_type,
    total_modules: moduleCount[certification_type],
    expires_at: expiresAt.toISOString(),
    next_step: 'Complete Module 1 to begin your certification journey'
  })
})

// POST /complete-module - Complete a certification module
academyRoutes.post('/complete-module', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { certification_type, module_score } = await c.req.json()
  
  const { env } = c
  const cert = await env.DB.prepare('SELECT * FROM academy_certifications WHERE user_id = ? AND certification_type = ? AND status IN (?,?)').bind(auth.uid, certification_type, 'enrolled', 'in_progress').first()
  if (!cert) return c.json({ error: 'Not enrolled in this certification' }, 404)
  
  const c2 = cert as any
  const newModulesCompleted = c2.modules_completed + 1
  const isComplete = newModulesCompleted >= c2.total_modules
  const avgScore = c2.score ? ((c2.score * c2.modules_completed) + (module_score || 80)) / newModulesCompleted : (module_score || 80)
  
  const certHash = isComplete ? btoa(JSON.stringify({ user: auth.uid, type: certification_type, score: avgScore, date: new Date().toISOString() })) : null
  
  await env.DB.prepare(`
    UPDATE academy_certifications SET modules_completed = ?, score = ?, status = ?, certificate_hash = ?, completed_at = ?
    WHERE user_id = ? AND certification_type = ? AND status IN (?,?)
  `).bind(
    newModulesCompleted, Math.round(avgScore),
    isComplete ? 'completed' : 'in_progress',
    certHash,
    isComplete ? new Date().toISOString() : null,
    auth.uid, certification_type, 'enrolled', 'in_progress'
  ).run()
  
  return c.json({
    certification_type,
    modules_completed: newModulesCompleted,
    total_modules: c2.total_modules,
    average_score: Math.round(avgScore),
    status: isComplete ? 'COMPLETED' : 'in_progress',
    certificate_hash: certHash,
    progress: `${Math.round(newModulesCompleted / c2.total_modules * 100)}%`
  })
})

// GET /my-certifications - Get user's certifications
academyRoutes.get('/my-certifications', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const certs = await c.env.DB.prepare('SELECT * FROM academy_certifications WHERE user_id = ? ORDER BY enrolled_at DESC').bind(auth.uid).all()
  return c.json({ certifications: certs.results })
})

// GET /resources - Resource Library (Part XVII.3)
academyRoutes.get('/resources', async (c) => {
  const category = c.req.query('category')
  const type = c.req.query('type')
  
  let query = 'SELECT * FROM academy_resources WHERE 1=1'
  const params: any[] = []
  if (category) { query += ' AND category = ?'; params.push(category) }
  if (type) { query += ' AND resource_type = ?'; params.push(type) }
  query += ' ORDER BY created_at DESC LIMIT 50'
  
  const resources = await c.env.DB.prepare(query).bind(...params).all()
  
  // Also return default library if empty
  if (!resources.results?.length) {
    return c.json({
      resources: [
        { id: 1, title: 'First-Time Investor Guide', title_ar: 'دليل المستثمر المبتدئ', resource_type: 'legal_guide', category: 'investing', access_level: 'public' },
        { id: 2, title: 'Egyptian LLC Formation Handbook', resource_type: 'legal_guide', category: 'legal', access_level: 'public' },
        { id: 3, title: 'Shareholder Agreement Template (with fundamental pricing)', resource_type: 'template', category: 'legal', access_level: 'verified' },
        { id: 4, title: 'NDA Template', resource_type: 'template', category: 'legal', access_level: 'verified' },
        { id: 5, title: 'Egyptian Tax Guide for Investors', resource_type: 'tax_guide', category: 'tax', access_level: 'public' },
        { id: 6, title: 'Sector P/E Ratios - Quarterly Update', resource_type: 'market_analysis', category: 'market', access_level: 'public' },
        { id: 7, title: 'Case Study: Street Bites Delivery (Tier A)', resource_type: 'case_study', category: 'success_stories', access_level: 'public' },
        { id: 8, title: 'Case Study: EcoPack Solutions (Tier B)', resource_type: 'case_study', category: 'success_stories', access_level: 'public' },
        { id: 9, title: 'Case Study: SmartFarm Egypt (Tier C)', resource_type: 'case_study', category: 'success_stories', access_level: 'public' },
        { id: 10, title: 'Case Study: Nile Brew Cafe (Tier D)', resource_type: 'case_study', category: 'success_stories', access_level: 'public' },
        { id: 11, title: 'GAFI Integration Tips', resource_type: 'legal_guide', category: 'compliance', access_level: 'verified' },
        { id: 12, title: 'Pitch Deck Best Practices', resource_type: 'workshop', category: 'founders', access_level: 'public' },
        { id: 13, title: 'Skill Barter Exchange Guide', resource_type: 'legal_guide', category: 'addons', access_level: 'verified' }
      ],
      total: 13,
      note: 'Default library - custom resources added by admin'
    })
  }
  
  return c.json({ resources: resources.results, total: resources.results?.length })
})

// POST /resources - Add a resource (admin)
academyRoutes.post('/resources', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { title, title_ar, resource_type, category, description, access_level } = await c.req.json()
  if (!title || !resource_type || !category) return c.json({ error: 'title, resource_type, category required' }, 400)
  
  await c.env.DB.prepare(`
    INSERT INTO academy_resources (title, title_ar, resource_type, category, description, access_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(title, title_ar || null, resource_type, category, description || null, access_level || 'public').run()
  
  return c.json({ message: 'Resource added successfully' })
})

// =============================================
// COMMUNITY & INVESTMENT CLUBS (Part XVII.4)
// =============================================

// GET /clubs - List investment clubs (Part XVII.4)
academyRoutes.get('/clubs', async (c) => {
  const clubs = await c.env.DB.prepare('SELECT * FROM investment_clubs ORDER BY member_count DESC').all()
  
  if (!clubs.results?.length) {
    // Default clubs from Part XVIII.2
    return c.json({
      clubs: [
        { id: 1, name: 'Cairo Investment Club', description: 'Financial district focus - weekly meetups', region: 'cairo', club_type: 'regional', member_count: 0 },
        { id: 2, name: 'Alexandria Mediterranean Trade Club', description: 'Mediterranean trade and export focus', region: 'alexandria', club_type: 'regional', member_count: 0 },
        { id: 3, name: 'Delta Agriculture & Manufacturing Club', description: 'Delta region - agriculture and manufacturing', region: 'delta', club_type: 'regional', member_count: 0 },
        { id: 4, name: 'Upper Egypt Regional Development Club', description: 'Upper Egypt - tourism and regional development', region: 'upper_egypt', club_type: 'regional', member_count: 0 },
        { id: 5, name: 'AUC Student Investor Club', description: 'American University in Cairo partnership', club_type: 'university', member_count: 0 },
        { id: 6, name: 'Cairo University Entrepreneurs Club', description: 'Cairo University entrepreneurship program', club_type: 'university', member_count: 0 },
        { id: 7, name: 'Technology & Innovation Circle', description: 'Tech sector investors and founders', club_type: 'sector', member_count: 0 },
        { id: 8, name: 'Green Investment Alliance', description: 'ESG and sustainability focused investors', club_type: 'sector', member_count: 0 }
      ]
    })
  }
  
  return c.json({ clubs: clubs.results })
})

// POST /clubs/join - Join an investment club
academyRoutes.post('/clubs/join', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const auth = verifyToken(token || '')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  
  const { club_id } = await c.req.json()
  if (!club_id) return c.json({ error: 'club_id required' }, 400)
  
  const { env } = c
  const existing = await env.DB.prepare('SELECT * FROM club_memberships WHERE club_id = ? AND user_id = ?').bind(club_id, auth.uid).first()
  if (existing) return c.json({ error: 'Already a member' }, 409)
  
  await env.DB.prepare('INSERT INTO club_memberships (club_id, user_id) VALUES (?, ?)').bind(club_id, auth.uid).run()
  await env.DB.prepare('UPDATE investment_clubs SET member_count = member_count + 1 WHERE id = ?').bind(club_id).run()
  
  return c.json({ message: 'Successfully joined club', club_id })
})

// GET /events - Virtual events calendar (Part XVII.4)
academyRoutes.get('/events', async (c) => {
  return c.json({
    upcoming_events: [
      { type: 'webinar', title: 'Weekly Expert Webinar: Egyptian Market Outlook', frequency: 'weekly', next: 'Every Thursday 7pm Cairo time' },
      { type: 'qa_session', title: 'Q&A with Successful Founders', frequency: 'bi-weekly', next: 'Every other Tuesday 6pm' },
      { type: 'regulatory_briefing', title: 'Regulatory Update: GAFI & FRA Changes', frequency: 'monthly', next: 'First Monday of each month' },
      { type: 'workshop', title: 'Skill Barter Exchange Workshop', frequency: 'monthly', next: 'Second Wednesday of each month' },
      { type: 'pitch_competition', title: 'SHERKETI University Challenge', frequency: 'quarterly', next: 'Q2 2026 Finals' },
      { type: 'summit', title: 'Annual SHERKETI Summit', frequency: 'annual', next: 'December 2026 - Cairo' },
      { type: 'meeting', title: 'Quarterly Shareholder Meetings', frequency: 'quarterly', next: 'End of each quarter' }
    ],
    community_features: {
      social_investing: 'Follow successful investors, share investment theses',
      collaborative_due_diligence: 'Group research and analysis tools',
      company_storytelling: 'Progress updates, behind-the-scenes, team intros via employee registry'
    },
    blueprint_reference: 'Part XVII.4 / Part XVIII - Community Engagement'
  })
})
