// ============================================================================
// SHERKETI Platform v3.3.0 — Full Dashboard UI
// AI-Governed Equity Crowdfunding for Egypt
// ============================================================================

const API = '';
let currentUser = null;
let token = localStorage.getItem('sherketi_token');
let currentPage = 'landing';
let pageParams = {};

// ---------- API Helper ----------
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  } catch (e) {
    if (e.status === 401) { logout(); }
    throw e;
  }
}

// ---------- Format Helpers ----------
const fEGP = n => n == null ? '—' : `${Number(n).toLocaleString('en-EG')} EGP`;
const fPct = n => n == null ? '—' : `${Number(n).toFixed(2)}%`;
const fDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fTime = d => d ? new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
const timeAgo = d => { if (!d) return '—'; const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return s + 's ago'; if (s < 3600) return Math.floor(s/60) + 'm ago'; if (s < 86400) return Math.floor(s/3600) + 'h ago'; return Math.floor(s/86400) + 'd ago'; };
const statusColor = s => ({ active:'emerald', funded:'blue', live_fundraising:'purple', interest_phase:'amber', draft:'gray', rejected:'red', frozen:'red', dissolved:'red', ai_review:'indigo' }[s] || 'gray');
const tierBadge = t => `<span class="px-2 py-0.5 rounded-full text-xs font-bold text-white tier-badge-${t}">Tier ${t}</span>`;
const statusDot = s => `<span class="status-dot status-${s === 'active' || s === 'funded' ? 'active' : s === 'frozen' || s === 'rejected' ? 'frozen' : 'pending'}"></span>`;

// ---------- Navigation ----------
function navigate(page, params = {}) {
  currentPage = page;
  pageParams = params;
  render();
  window.scrollTo(0, 0);
}

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('sherketi_token');
  navigate('landing');
}

// ---------- Toast ----------
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `fixed top-4 right-4 z-[200] px-6 py-3 rounded-xl shadow-2xl text-white font-semibold text-sm fade-in ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ---------- Modal ----------
function showModal(title, content, actions = '') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 fade-in max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-slate-800">${title}</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fas fa-times"></i></button>
      </div>
      <div class="text-slate-600 text-sm">${content}</div>
      ${actions ? `<div class="flex gap-3 mt-6 justify-end">${actions}</div>` : ''}
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function closeModal() { document.getElementById('modal-overlay')?.remove(); }

// ---------- Init ----------
async function init() {
  if (token) {
    try {
      const data = await api('/api/auth/me');
      currentUser = data.user;
      navigate('dashboard');
    } catch { logout(); }
  } else {
    render();
  }
}

// ---------- Main Render ----------
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';
  
  if (currentUser) {
    app.innerHTML = renderNav() + `<div class="flex min-h-screen"><aside class="w-64 bg-white border-r border-slate-200 pt-20 pb-8 px-4 fixed h-full overflow-y-auto z-30 hidden lg:block">${renderSidebar()}</aside><main class="flex-1 lg:ml-64 pt-20 pb-12 px-4 sm:px-6 lg:px-8">${renderCurrentPage()}</main></div>`;
  } else {
    app.innerHTML = renderCurrentPage();
  }
  
  bindEvents();
}

// ---------- Navigation Bar ----------
function renderNav() {
  return `<nav class="fixed top-0 left-0 right-0 z-40 glass border-b border-slate-200/50">
    <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
      <div class="flex items-center gap-3">
        <button id="mobile-menu-btn" class="lg:hidden text-slate-600 hover:text-primary-600"><i class="fas fa-bars text-xl"></i></button>
        <a href="#" onclick="navigate('dashboard');return false" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span class="font-bold text-lg gradient-text hidden sm:inline">SHERKETI</span>
        </a>
        <span class="text-xs text-slate-400 hidden md:inline">v3.3.0</span>
      </div>
      <div class="flex items-center gap-4">
        <button onclick="navigate('notifications')" class="relative text-slate-500 hover:text-primary-600">
          <i class="fas fa-bell text-lg"></i>
          <span id="notif-badge" class="hidden absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center"></span>
        </button>
        <div class="flex items-center gap-2 cursor-pointer" onclick="navigate('profile')">
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">${(currentUser?.full_name || 'U').charAt(0)}</div>
          <div class="hidden sm:block">
            <div class="text-sm font-semibold text-slate-700">${currentUser?.full_name || 'User'}</div>
            <div class="text-xs text-slate-400 capitalize">${currentUser?.role || ''}</div>
          </div>
        </div>
        <button onclick="logout()" class="text-slate-400 hover:text-red-500 text-sm"><i class="fas fa-sign-out-alt"></i></button>
      </div>
    </div>
  </nav>`;
}

// ---------- Sidebar ----------
function renderSidebar() {
  const role = currentUser?.role || 'investor';
  const items = [
    { icon: 'fa-th-large', label: 'Dashboard', page: 'dashboard' },
    { icon: 'fa-folder-open', label: 'Projects', page: 'projects' },
    { icon: 'fa-chart-line', label: 'Secondary Market', page: 'market' },
    { icon: 'fa-gavel', label: 'Governance', page: 'governance' },
    { icon: 'fa-scroll', label: 'Constitution', page: 'constitution' },
    { icon: 'fa-robot', label: 'AI Tools', page: 'ai-tools' },
    { icon: 'fa-money-bill-wave', label: 'Financial', page: 'financial' },
    { icon: 'fa-users-cog', label: 'Board Operations', page: 'board-ops' },
    { icon: 'fa-puzzle-piece', label: 'Add-ons', page: 'addons' },
  ];
  if (['admin', 'regulator'].includes(role)) {
    items.push({ icon: 'fa-shield-alt', label: 'Admin Panel', page: 'admin' });
  }
  items.push({ icon: 'fa-bell', label: 'Notifications', page: 'notifications' });
  items.push({ icon: 'fa-cog', label: 'Settings', page: 'profile' });

  return `<div class="space-y-1">${items.map(i => 
    `<div class="sidebar-item ${currentPage === i.page ? 'active' : ''}" onclick="navigate('${i.page}')">
      <i class="fas ${i.icon} w-5 text-center"></i><span class="text-sm">${i.label}</span>
    </div>`
  ).join('')}</div>
  <div class="mt-8 p-3 rounded-xl bg-primary-50 border border-primary-100">
    <div class="text-xs font-semibold text-primary-700 mb-1"><i class="fas fa-info-circle mr-1"></i>SHERKETI Blueprint</div>
    <div class="text-[11px] text-primary-600">v3.1 — 10 Constitutional Rules<br>Fee: 2.5% cash + 2.5% equity</div>
  </div>`;
}

// ---------- Page Router ----------
function renderCurrentPage() {
  switch (currentPage) {
    case 'landing': return renderLanding();
    case 'login': return renderLogin();
    case 'register': return renderRegister();
    case 'dashboard': return renderDashboard();
    case 'projects': return renderProjects();
    case 'project-detail': return renderProjectDetail();
    case 'create-project': return renderCreateProject();
    case 'market': return renderMarket();
    case 'governance': return renderGovernance();
    case 'constitution': return renderConstitution();
    case 'ai-tools': return renderAITools();
    case 'financial': return renderFinancial();
    case 'board-ops': return renderBoardOps();
    case 'addons': return renderAddons();
    case 'admin': return renderAdmin();
    case 'notifications': return renderNotifications();
    case 'profile': return renderProfile();
    default: return renderLanding();
  }
}

// ==========================================================================
// LANDING PAGE
// ==========================================================================
function renderLanding() {
  return `<div class="hero-gradient min-h-screen">
    <nav class="flex items-center justify-between px-6 lg:px-12 py-4">
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">S</div>
        <span class="text-white font-bold text-xl">SHERKETI</span>
      </div>
      <div class="flex gap-3">
        <button onclick="navigate('login')" class="btn-secondary text-sm">Log In</button>
        <button onclick="navigate('register')" class="btn-primary text-sm">Get Started</button>
      </div>
    </nav>
    <div class="max-w-5xl mx-auto px-6 pt-20 pb-32 text-center">
      <div class="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold mb-6">
        <i class="fas fa-shield-alt mr-1"></i> Blueprint v3.1 — AI-Governed — 10 Constitutional Rules
      </div>
      <h1 class="text-4xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">AI-Governed Equity<br>Crowdfunding for Egypt</h1>
      <p class="text-lg text-white/70 max-w-2xl mx-auto mb-10">Invest from 50 EGP. AI feasibility scoring, constitutional governance, law-firm escrow, and full transparency — all in one platform.</p>
      <div class="flex gap-4 justify-center flex-wrap">
        <button onclick="navigate('register')" class="btn-primary text-base px-8 py-3">
          <i class="fas fa-rocket mr-2"></i>Start Investing
        </button>
        <button onclick="navigate('projects')" class="btn-secondary text-base px-8 py-3">
          <i class="fas fa-search mr-2"></i>Explore Projects
        </button>
      </div>
      <div id="platform-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto"></div>
    </div>
    <div class="max-w-6xl mx-auto px-6 pb-20">
      <div class="grid md:grid-cols-3 gap-6">
        ${[
          { icon:'fa-brain', title:'AI Feasibility', desc:'Every project scored by AI before listing. Score < 35 = rejected.' },
          { icon:'fa-landmark', title:'Law Firm Escrow', desc:'Funds held in regulated escrow. Dual-signature for large releases.' },
          { icon:'fa-vote-yea', title:'Democratic Governance', desc:'Shareholders vote on everything. SHERKETI veto only for legal violations.' }
        ].map(f => `<div class="glass rounded-2xl p-6 card-hover">
          <div class="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
            <i class="fas ${f.icon} text-primary-500 text-xl"></i>
          </div>
          <h3 class="font-bold text-slate-800 mb-2">${f.title}</h3>
          <p class="text-sm text-slate-500">${f.desc}</p>
        </div>`).join('')}
      </div>
    </div>
    <footer class="text-center py-8 text-white/40 text-xs">
      SHERKETI Platform v3.3.0 — AI-Governed Equity Crowdfunding<br>
      Fee Model: 2.5% Cash Commission + 2.5% Equity Stake + 5yr Board Seat + Veto (All Tiers)
    </footer>
  </div>`;
}

// ==========================================================================
// AUTH PAGES
// ==========================================================================
function renderLogin() {
  return `<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md fade-in">
      <div class="text-center mb-8">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">S</div>
        <h2 class="text-2xl font-bold text-slate-800">Welcome Back</h2>
        <p class="text-sm text-slate-500 mt-1">Sign in to SHERKETI Platform</p>
      </div>
      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" id="login-email" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="you@example.com">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" id="login-password" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Enter password">
        </div>
        <button type="submit" class="btn-primary w-full py-3 text-sm">
          <i class="fas fa-sign-in-alt mr-2"></i>Sign In
        </button>
        <div id="login-error" class="text-red-500 text-sm text-center hidden"></div>
      </form>
      <p class="text-center text-sm text-slate-500 mt-6">
        Don't have an account? <a href="#" onclick="navigate('register');return false" class="text-primary-600 font-semibold hover:underline">Register</a>
      </p>
      <p class="text-center mt-2"><a href="#" onclick="navigate('landing');return false" class="text-slate-400 text-xs hover:underline"><i class="fas fa-arrow-left mr-1"></i>Back to Home</a></p>
    </div>
  </div>`;
}

function renderRegister() {
  return `<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg fade-in">
      <div class="text-center mb-6">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">S</div>
        <h2 class="text-2xl font-bold text-slate-800">Create Account</h2>
        <p class="text-sm text-slate-500 mt-1">Join SHERKETI — Invest from 50 EGP</p>
      </div>
      <form id="register-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Full Name (EN)</label>
            <input type="text" id="reg-name" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="John Doe">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Full Name (AR)</label>
            <input type="text" id="reg-name-ar" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm ar-text" placeholder="الاسم الكامل">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" id="reg-email" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="you@example.com">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" id="reg-password" required minlength="6" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Min 6 characters">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select id="reg-role" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
              <option value="investor">Investor</option>
              <option value="founder">Founder</option>
              <option value="manager">Manager</option>
              <option value="accountant">Accountant</option>
              <option value="law_firm">Law Firm</option>
              <option value="regulator">Regulator</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Region</label>
            <select id="reg-region" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
              <option value="cairo">Cairo</option>
              <option value="alexandria">Alexandria</option>
              <option value="delta">Delta</option>
              <option value="upper_egypt">Upper Egypt</option>
              <option value="suez_canal">Suez Canal</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">National ID</label>
          <input type="text" id="reg-nid" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="14-digit National ID">
        </div>
        <button type="submit" class="btn-primary w-full py-3 text-sm">
          <i class="fas fa-user-plus mr-2"></i>Create Account
        </button>
        <div id="register-error" class="text-red-500 text-sm text-center hidden"></div>
      </form>
      <p class="text-center text-sm text-slate-500 mt-6">
        Already have an account? <a href="#" onclick="navigate('login');return false" class="text-primary-600 font-semibold hover:underline">Sign In</a>
      </p>
    </div>
  </div>`;
}

// ==========================================================================
// DASHBOARD (Role-Based)
// ==========================================================================
function renderDashboard() {
  const role = currentUser?.role || 'investor';
  return `<div class="fade-in">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p class="text-sm text-slate-500">Welcome back, ${currentUser?.full_name || 'User'}</p>
      </div>
      <div class="flex gap-2">
        ${role === 'founder' ? '<button onclick="navigate(\'create-project\')" class="btn-primary text-sm"><i class="fas fa-plus mr-1"></i>New Project</button>' : ''}
        <button onclick="loadDashboard()" class="btn-secondary text-sm"><i class="fas fa-sync-alt mr-1"></i>Refresh</button>
      </div>
    </div>
    <div id="dashboard-content"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div></div>
  </div>`;
}

async function loadDashboard() {
  const role = currentUser?.role || 'investor';
  const el = document.getElementById('dashboard-content');
  if (!el) return;
  
  try {
    let endpoint = '/api/dashboard/investor';
    if (role === 'founder') endpoint = '/api/dashboard/founder';
    else if (role === 'manager') endpoint = '/api/dashboard/manager';
    else if (role === 'law_firm') endpoint = '/api/dashboard/law-firm';
    else if (role === 'regulator') endpoint = '/api/dashboard/regulator';
    else if (role === 'accountant') endpoint = '/api/dashboard/accountant';
    else if (role === 'admin') endpoint = '/api/dashboard/regulator';

    const data = await api(endpoint);
    
    if (role === 'investor') {
      el.innerHTML = renderInvestorDash(data);
    } else if (role === 'founder') {
      el.innerHTML = renderFounderDash(data);
    } else if (role === 'regulator' || role === 'admin') {
      el.innerHTML = renderRegulatorDash(data);
    } else {
      el.innerHTML = renderGenericDash(data);
    }
  } catch (e) {
    el.innerHTML = `<div class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
      <i class="fas fa-exclamation-triangle text-amber-500 text-2xl mb-2"></i>
      <p class="text-amber-700 text-sm">Could not load dashboard data. <button onclick="loadDashboard()" class="underline">Retry</button></p>
    </div>`;
  }
}

function renderInvestorDash(d) {
  const s = d.summary || {};
  return `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${statCard('fa-wallet', 'Total Invested', fEGP(s.total_invested), 'primary')}
      ${statCard('fa-chart-line', 'Current Value', fEGP(s.current_value), 'emerald')}
      ${statCard('fa-percentage', 'ROI', s.roi || '0%', 'accent')}
      ${statCard('fa-folder', 'Projects', s.projects_count || 0, 'gold')}
    </div>
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-briefcase mr-2 text-primary-500"></i>Portfolio</h3>
        ${(d.portfolio || []).length === 0 ? '<p class="text-slate-400 text-sm text-center py-8">No investments yet. <a href="#" onclick="navigate(\'projects\');return false" class="text-primary-600 underline">Browse projects</a></p>' : 
          `<div class="space-y-3">${(d.portfolio || []).map(p => `
            <div class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer" onclick="navigate('project-detail',{id:${p.project_id}})">
              <div>
                <div class="font-semibold text-sm text-slate-800">${p.title || 'Project #' + p.project_id}</div>
                <div class="text-xs text-slate-500">${tierBadge(p.tier || 'A')} ${fPct(p.equity_percentage)} equity</div>
              </div>
              <div class="text-right">
                <div class="font-semibold text-sm text-emerald-600">${fEGP(p.investment_amount)}</div>
                <div class="text-xs text-slate-400">${p.project_status || 'active'}</div>
              </div>
            </div>`).join('')}</div>`}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-vote-yea mr-2 text-accent-500"></i>Pending Votes</h3>
        ${(d.pending_votes || []).length === 0 ? '<p class="text-slate-400 text-sm text-center py-8">No pending votes</p>' :
          `<div class="space-y-3">${(d.pending_votes || []).map(v => `
            <div class="p-3 rounded-xl border border-slate-100 hover:border-primary-200">
              <div class="font-semibold text-sm text-slate-800">${v.title}</div>
              <div class="text-xs text-slate-500">${v.project_title || ''} — ${v.vote_type}</div>
              <div class="text-xs text-amber-600 mt-1"><i class="fas fa-clock mr-1"></i>Deadline: ${fTime(v.voting_deadline)}</div>
            </div>`).join('')}</div>`}
      </div>
    </div>
    <div class="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-store mr-2 text-purple-500"></i>Market Opportunities</h3>
      ${(d.market_opportunities || []).length === 0 ? '<p class="text-slate-400 text-sm text-center py-4">No market opportunities</p>' :
        `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${(d.market_opportunities || []).map(o => `
          <div class="p-3 rounded-xl border border-slate-100 hover:border-primary-200 card-hover">
            <div class="font-semibold text-sm">${o.title || 'Project'}</div>
            <div class="text-xs text-slate-500">${o.shares_count} shares at ${fEGP(o.ask_price)}/share</div>
          </div>`).join('')}</div>`}
    </div>`;
}

function renderFounderDash(d) {
  return `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${statCard('fa-folder', 'Projects', (d.projects || []).length, 'primary')}
      ${statCard('fa-users', 'Total Investors', (d.projects || []).reduce((a,p) => a + (p.investor_count || 0), 0), 'emerald')}
      ${statCard('fa-exclamation-triangle', 'Active Alerts', (d.projects || []).reduce((a,p) => a + (p.active_alerts || 0), 0), 'red')}
      ${statCard('fa-vote-yea', 'Open Votes', (d.projects || []).reduce((a,p) => a + (p.open_votes || 0), 0), 'amber')}
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
      <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-project-diagram mr-2 text-primary-500"></i>My Projects</h3>
      <div class="space-y-3">
        ${(d.projects || []).map(p => `
          <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-primary-200 cursor-pointer card-hover" onclick="navigate('project-detail',{id:${p.id}})">
            <div class="flex items-center gap-3">
              ${statusDot(p.status)}
              <div>
                <div class="font-semibold text-sm">${p.title}</div>
                <div class="text-xs text-slate-500">${tierBadge(p.tier)} ${p.sector || ''} — ${p.status}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-sm">${fEGP(p.funding_raised)} / ${fEGP(p.funding_goal)}</div>
              <div class="w-32 h-2 bg-slate-100 rounded-full mt-1"><div class="h-2 bg-primary-500 rounded-full progress-bar" style="width:${Math.min(100, (p.funding_raised || 0) / (p.funding_goal || 1) * 100)}%"></div></div>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-flag-checkered mr-2 text-emerald-500"></i>Milestones</h3>
        ${(d.milestones || []).slice(0, 8).map(m => `
          <div class="flex items-center gap-3 p-2 text-sm">
            <i class="fas ${m.status === 'completed' ? 'fa-check-circle text-emerald-500' : m.status === 'overdue' ? 'fa-exclamation-circle text-red-500' : 'fa-circle text-slate-300'} text-sm"></i>
            <span class="flex-1">${m.title}</span>
            <span class="text-xs text-slate-400">${m.project_title || ''}</span>
          </div>`).join('')}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-piggy-bank mr-2 text-amber-500"></i>Escrow Overview</h3>
        ${(d.escrow_overview || []).map(e => `
          <div class="p-3 rounded-lg bg-slate-50 mb-2">
            <div class="font-semibold text-sm">${e.title}</div>
            <div class="grid grid-cols-3 gap-2 text-xs mt-1">
              <div>Deposits: ${fEGP(e.total_deposits)}</div>
              <div>Released: ${fEGP(e.total_released)}</div>
              <div>Commission: ${fEGP(e.jozour_commission_paid)}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderRegulatorDash(d) {
  return `
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
      <i class="fas fa-eye text-amber-500"></i>
      <div class="text-sm text-amber-700 font-medium">FRA Shadow Mode — Read-only aggregated data. No PII exposed.</div>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${statCard('fa-folder', 'Total Projects', (d.project_statistics || []).reduce((a,p) => a + (p.count || 0), 0), 'primary')}
      ${statCard('fa-balance-scale', 'Escrow Types', (d.escrow_balance || []).length, 'emerald')}
      ${statCard('fa-exclamation-circle', 'Active Risks', (d.active_risks || []).reduce((a,r) => a + (r.count || 0), 0), 'red')}
      ${statCard('fa-gavel', 'Disputes', (d.dispute_summary || []).reduce((a,r) => a + (r.count || 0), 0), 'amber')}
    </div>
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-chart-bar mr-2 text-primary-500"></i>Project Statistics</h3>
        <div class="overflow-x-auto"><table class="w-full text-sm">
          <thead><tr class="text-left text-xs text-slate-500 border-b"><th class="pb-2">Tier</th><th>Status</th><th>Count</th><th>Goal</th><th>Raised</th></tr></thead>
          <tbody>${(d.project_statistics || []).map(p => `<tr class="border-b border-slate-50"><td class="py-2">${tierBadge(p.tier || '?')}</td><td>${p.status}</td><td>${p.count}</td><td>${fEGP(p.total_goal)}</td><td>${fEGP(p.total_raised)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-landmark mr-2 text-emerald-500"></i>SHERKETI Overview</h3>
        <div class="space-y-2">${(d.jozour_overview || []).map(j => `
          <div class="flex justify-between p-2 bg-slate-50 rounded-lg text-sm">
            <span>${tierBadge(j.tier)} ${j.projects} projects</span>
            <span class="text-emerald-600 font-semibold">${fEGP(j.total_commission)} commission</span>
          </div>`).join('')}</div>
      </div>
    </div>`;
}

function renderGenericDash(d) {
  return `<div class="bg-white rounded-2xl border border-slate-200 p-6">
    <h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-th-large mr-2"></i>Dashboard Data</h3>
    <pre class="text-xs bg-slate-50 p-4 rounded-lg overflow-x-auto">${JSON.stringify(d, null, 2)}</pre>
  </div>`;
}

function statCard(icon, label, value, color = 'primary') {
  const colors = { primary:'from-primary-500 to-primary-600', emerald:'from-emerald-500 to-emerald-600', accent:'from-accent-500 to-accent-600', gold:'from-amber-400 to-amber-500', red:'from-red-500 to-red-600', amber:'from-amber-500 to-amber-600', blue:'from-blue-500 to-blue-600' };
  return `<div class="bg-white rounded-2xl border border-slate-200 p-4 card-hover">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color] || colors.primary} flex items-center justify-center text-white"><i class="fas ${icon}"></i></div>
      <div><div class="text-xs text-slate-500">${label}</div><div class="text-lg font-bold text-slate-800">${value}</div></div>
    </div>
  </div>`;
}

// ==========================================================================
// PROJECTS
// ==========================================================================
function renderProjects() {
  return `<div class="fade-in">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Projects</h1>
      <div class="flex gap-2">
        ${currentUser?.role === 'founder' ? '<button onclick="navigate(\'create-project\')" class="btn-primary text-sm"><i class="fas fa-plus mr-1"></i>New Project</button>' : ''}
      </div>
    </div>
    <div class="flex gap-2 mb-4 flex-wrap">
      ${['all','live_fundraising','interest_phase','funded','active','draft'].map(s => 
        `<button onclick="loadProjects('${s}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold border ${s === 'all' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}" id="filter-${s}">${s === 'all' ? 'All' : s.replace(/_/g,' ')}</button>`
      ).join('')}
    </div>
    <div id="projects-list"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div></div>
  </div>`;
}

async function loadProjects(status = 'all') {
  const el = document.getElementById('projects-list');
  if (!el) return;
  try {
    const params = status !== 'all' ? `?status=${status}` : '';
    const data = await api(`/api/projects${params}`);
    const projects = data.projects || [];
    if (projects.length === 0) {
      el.innerHTML = '<p class="text-slate-400 text-center py-16">No projects found</p>';
      return;
    }
    el.innerHTML = `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${projects.map(renderProjectCard).join('')}</div>`;
  } catch (e) {
    el.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load projects</p>';
  }
}

function renderProjectCard(p) {
  const pct = p.funding_goal > 0 ? Math.min(100, (p.funding_raised || 0) / p.funding_goal * 100) : 0;
  return `<div class="bg-white rounded-2xl border border-slate-200 p-5 card-hover cursor-pointer" onclick="navigate('project-detail',{id:${p.id}})">
    <div class="flex items-center justify-between mb-3">
      ${tierBadge(p.tier || 'A')}
      <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${statusColor(p.status)}-100 text-${statusColor(p.status)}-700">${(p.status || 'draft').replace(/_/g,' ')}</span>
    </div>
    <h3 class="font-bold text-slate-800 mb-1 truncate">${p.title}</h3>
    <p class="text-xs text-slate-500 mb-3">${p.sector || 'General'} — ${p.founder_name || 'Unknown'}</p>
    <div class="flex items-end justify-between mb-2">
      <div><div class="text-xs text-slate-400">Raised</div><div class="font-bold text-primary-600">${fEGP(p.funding_raised)}</div></div>
      <div class="text-right"><div class="text-xs text-slate-400">Goal</div><div class="font-semibold text-slate-700">${fEGP(p.funding_goal)}</div></div>
    </div>
    <div class="w-full h-2 bg-slate-100 rounded-full"><div class="h-2 bg-primary-500 rounded-full progress-bar" style="width:${pct}%"></div></div>
    <div class="flex items-center justify-between mt-3 text-xs text-slate-500">
      <span><i class="fas fa-robot mr-1"></i>AI: ${p.ai_feasibility_score || '—'}/100</span>
      <span><i class="fas fa-heart mr-1"></i>Health: ${p.health_score || '—'}</span>
    </div>
  </div>`;
}

// ==========================================================================
// PROJECT DETAIL
// ==========================================================================
function renderProjectDetail() {
  return `<div class="fade-in" id="project-detail-content">
    <div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div>
  </div>`;
}

async function loadProjectDetail(id) {
  const el = document.getElementById('project-detail-content');
  if (!el) return;
  try {
    const data = await api(`/api/projects/${id}`);
    const p = data.project;
    if (!p) { el.innerHTML = '<p class="text-red-500">Project not found</p>'; return; }
    
    const pct = p.funding_goal > 0 ? Math.min(100, (p.funding_raised || 0) / p.funding_goal * 100) : 0;
    el.innerHTML = `
      <button onclick="navigate('projects')" class="text-sm text-slate-500 hover:text-primary-600 mb-4 inline-block"><i class="fas fa-arrow-left mr-1"></i>Back to Projects</button>
      <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div class="flex items-center gap-2 mb-2">${tierBadge(p.tier)} <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${statusColor(p.status)}-100 text-${statusColor(p.status)}-700">${(p.status || '').replace(/_/g,' ')}</span></div>
            <h1 class="text-2xl font-bold text-slate-800">${p.title}</h1>
            ${p.title_ar ? `<h2 class="text-lg text-slate-600 ar-text">${p.title_ar}</h2>` : ''}
            <p class="text-sm text-slate-500 mt-1">${p.sector} — by ${p.founder_name || 'Unknown'}</p>
          </div>
          <div class="flex gap-2">
            ${p.status === 'live_fundraising' ? '<button class="btn-primary text-sm" onclick="showInvestModal()"><i class="fas fa-hand-holding-usd mr-1"></i>Invest</button>' : ''}
            ${p.status === 'interest_phase' ? '<button class="btn-primary text-sm" onclick="expressInterest()"><i class="fas fa-heart mr-1"></i>Express Interest</button>' : ''}
          </div>
        </div>
        <p class="text-sm text-slate-600 mb-6">${p.description || ''}</p>
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="font-semibold">${fEGP(p.funding_raised)} raised</span>
            <span class="text-slate-500">of ${fEGP(p.funding_goal)}</span>
          </div>
          <div class="w-full h-3 bg-slate-100 rounded-full"><div class="h-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full progress-bar" style="width:${pct}%"></div></div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${miniStat('AI Score', (p.ai_feasibility_score || '—') + '/100')}
          ${miniStat('Valuation', fEGP(p.pre_money_valuation))}
          ${miniStat('Min Investment', fEGP(p.min_investment || 50))}
          ${miniStat('SHERKETI Fee', '2.5% + 2.5%')}
        </div>
      </div>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-users mr-2 text-primary-500"></i>Shareholders (${(data.shareholders || []).length})</h3>
          <div class="space-y-2 max-h-64 overflow-y-auto">${(data.shareholders || []).map(s => `
            <div class="flex justify-between text-sm p-2 rounded-lg hover:bg-slate-50">
              <span>${s.full_name || 'Anon'}</span>
              <span class="font-semibold">${fPct(s.equity_percentage)}</span>
            </div>`).join('')}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-user-tie mr-2 text-emerald-500"></i>Board (${(data.board || []).length})</h3>
          <div class="space-y-2">${(data.board || []).map(b => `
            <div class="flex justify-between text-sm p-2 rounded-lg hover:bg-slate-50">
              <span>${b.full_name || 'Member'} <span class="text-xs text-slate-400">(${b.role})</span></span>
              ${b.has_veto ? '<span class="text-xs text-red-500 font-semibold">VETO</span>' : ''}
            </div>`).join('')}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-flag-checkered mr-2 text-amber-500"></i>Milestones</h3>
          <div class="space-y-2">${(data.milestones || []).map(m => `
            <div class="flex items-center gap-2 text-sm p-2">
              <i class="fas ${m.status === 'completed' ? 'fa-check-circle text-emerald-500' : 'fa-circle text-slate-300'} text-xs"></i>
              <span class="flex-1">${m.title}</span>
              <span class="text-xs text-slate-400">${fEGP(m.tranche_amount)}</span>
            </div>`).join('')}</div>
        </div>
      </div>
      <div class="grid lg:grid-cols-2 gap-6 mt-6">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-history mr-2 text-indigo-500"></i>Governance Events</h3>
          <div class="space-y-2 max-h-48 overflow-y-auto">${(data.governance_events || []).map(e => `
            <div class="text-xs p-2 rounded-lg bg-slate-50"><span class="font-semibold">${e.event_type}</span> — ${e.actor_name || 'System'} <span class="text-slate-400 ml-1">${timeAgo(e.created_at)}</span></div>
          `).join('')}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>Risk Alerts</h3>
          ${(data.risk_alerts || []).length === 0 ? '<p class="text-sm text-slate-400 text-center py-4">No active alerts</p>' :
            `<div class="space-y-2">${(data.risk_alerts || []).map(a => `
              <div class="text-xs p-2 rounded-lg border ${a.alert_level === 'red' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}">
                <span class="font-semibold">${a.title}</span>
              </div>`).join('')}</div>`}
        </div>
      </div>`;
  } catch (e) {
    el.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load project</p>';
  }
}

function miniStat(label, value) {
  return `<div class="p-3 rounded-xl bg-slate-50"><div class="text-xs text-slate-500">${label}</div><div class="font-bold text-sm text-slate-800">${value}</div></div>`;
}

function showInvestModal() {
  showModal('Invest in Project', `
    <div class="space-y-4">
      <div><label class="block text-sm font-medium text-slate-700 mb-1">Investment Amount (EGP)</label>
        <input type="number" id="invest-amount" min="50" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Min 50 EGP">
      </div>
      <p class="text-xs text-slate-500">Funds will be held in law firm escrow. 48hr reservation.</p>
    </div>`,
    `<button onclick="closeModal()" class="btn-secondary text-sm">Cancel</button>
     <button onclick="doInvest()" class="btn-primary text-sm"><i class="fas fa-check mr-1"></i>Confirm Investment</button>`
  );
}

async function doInvest() {
  const amount = parseFloat(document.getElementById('invest-amount')?.value);
  if (!amount || amount < 50) return showToast('Minimum 50 EGP', 'error');
  try {
    const res = await api(`/api/projects/${pageParams.id}/invest`, { method: 'POST', body: JSON.stringify({ amount }) });
    closeModal();
    showToast(`Invested ${fEGP(amount)} — ${res.equity_percentage}% equity`);
    loadProjectDetail(pageParams.id);
  } catch (e) { showToast(e.error || 'Investment failed', 'error'); }
}

async function expressInterest() {
  try {
    const res = await api(`/api/projects/${pageParams.id}/interest`, { method: 'POST', body: JSON.stringify({ pledge_amount: 1000 }) });
    showToast(res.message || 'Interest recorded');
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

// ==========================================================================
// CREATE PROJECT
// ==========================================================================
function renderCreateProject() {
  return `<div class="fade-in max-w-2xl mx-auto">
    <button onclick="navigate('projects')" class="text-sm text-slate-500 hover:text-primary-600 mb-4 inline-block"><i class="fas fa-arrow-left mr-1"></i>Back</button>
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 class="text-xl font-bold text-slate-800 mb-6"><i class="fas fa-plus-circle mr-2 text-primary-500"></i>Create Project</h2>
      <form id="create-project-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm font-medium text-slate-700 mb-1">Title (EN)*</label><input type="text" id="cp-title" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"></div>
          <div><label class="block text-sm font-medium text-slate-700 mb-1">Title (AR)</label><input type="text" id="cp-title-ar" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm ar-text"></div>
        </div>
        <div><label class="block text-sm font-medium text-slate-700 mb-1">Description*</label><textarea id="cp-desc" required rows="3" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"></textarea></div>
        <div class="grid grid-cols-3 gap-3">
          <div><label class="block text-sm font-medium text-slate-700 mb-1">Sector*</label>
            <select id="cp-sector" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
              ${['Technology','FinTech','Green Energy','Healthcare','Food & Beverage','Real Estate','Education','E-Commerce','Manufacturing','Agriculture','Logistics','Other'].map(s => `<option>${s}</option>`).join('')}
            </select>
          </div>
          <div><label class="block text-sm font-medium text-slate-700 mb-1">Tier*</label>
            <select id="cp-tier" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
              <option value="A">Tier A (max 3M)</option><option value="B">Tier B (max 25M)</option>
              <option value="C">Tier C (unlimited)</option><option value="D">Tier D (unlimited)</option>
            </select>
          </div>
          <div><label class="block text-sm font-medium text-slate-700 mb-1">Funding Goal (EGP)*</label><input type="number" id="cp-goal" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"></div>
        </div>
        <div><label class="block text-sm font-medium text-slate-700 mb-1">Equity Offered (%)*</label><input type="number" id="cp-equity" required min="1" max="100" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"></div>
        <div class="bg-primary-50 border border-primary-100 rounded-xl p-4 text-xs text-primary-700">
          <strong>SHERKETI Fee (All Tiers):</strong> 2.5% cash commission + 2.5% equity stake + 5yr board seat with veto
        </div>
        <button type="submit" class="btn-primary w-full py-3 text-sm"><i class="fas fa-paper-plane mr-2"></i>Create & Submit for AI Review</button>
      </form>
    </div>
  </div>`;
}

// ==========================================================================
// SECONDARY MARKET
// ==========================================================================
function renderMarket() {
  return `<div class="fade-in">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-slate-800"><i class="fas fa-chart-line mr-2"></i>Secondary Market</h1>
      <button onclick="showSellModal()" class="btn-primary text-sm"><i class="fas fa-tag mr-1"></i>Sell Shares</button>
    </div>
    <div id="market-content"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div></div>
  </div>`;
}

async function loadMarket() {
  const el = document.getElementById('market-content');
  if (!el) return;
  try {
    const data = await api('/api/market/orders');
    const orders = data.orders || [];
    el.innerHTML = orders.length === 0 ? '<p class="text-slate-400 text-center py-16">No market orders</p>' :
      `<div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead><tr class="bg-slate-50 text-left text-xs text-slate-500"><th class="px-4 py-3">Project</th><th>Seller</th><th>Shares</th><th>Price/Share</th><th>Status</th><th>Priority End</th><th></th></tr></thead>
          <tbody>${orders.map(o => `
            <tr class="border-t border-slate-100 hover:bg-slate-50">
              <td class="px-4 py-3 font-semibold">${o.project_title || '#' + o.project_id}</td>
              <td>${o.seller_name || 'Anon'}</td>
              <td>${o.shares_count}</td>
              <td>${fEGP(o.ask_price)}</td>
              <td><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${statusColor(o.status)}-100 text-${statusColor(o.status)}-700">${o.status}</span></td>
              <td class="text-xs text-slate-400">${fTime(o.priority_window_end)}</td>
              <td>${o.status !== 'completed' ? `<button onclick="buyOrder(${o.id})" class="text-xs text-primary-600 font-semibold hover:underline">Buy</button>` : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) { el.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load market</p>'; }
}

function showSellModal() {
  showModal('Sell Shares', `
    <div class="space-y-3">
      <div><label class="block text-sm font-medium mb-1">Project ID</label><input type="number" id="sell-pid" class="w-full px-3 py-2 rounded-xl border text-sm"></div>
      <div><label class="block text-sm font-medium mb-1">Shares Count</label><input type="number" id="sell-shares" class="w-full px-3 py-2 rounded-xl border text-sm"></div>
      <div><label class="block text-sm font-medium mb-1">Ask Price (EGP/share)</label><input type="number" id="sell-price" class="w-full px-3 py-2 rounded-xl border text-sm"></div>
    </div>`,
    `<button onclick="closeModal()" class="btn-secondary text-sm">Cancel</button><button onclick="doSell()" class="btn-primary text-sm">List Shares</button>`);
}

async function doSell() {
  try {
    await api('/api/market/sell', { method: 'POST', body: JSON.stringify({
      project_id: +document.getElementById('sell-pid').value,
      shares_count: +document.getElementById('sell-shares').value,
      ask_price: +document.getElementById('sell-price').value
    })});
    closeModal(); showToast('Sell order created'); loadMarket();
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

async function buyOrder(id) {
  try {
    await api(`/api/market/buy/${id}`, { method: 'POST' });
    showToast('Buy order placed'); loadMarket();
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

// ==========================================================================
// GOVERNANCE
// ==========================================================================
function renderGovernance() {
  return `<div class="fade-in">
    <h1 class="text-2xl font-bold text-slate-800 mb-6"><i class="fas fa-gavel mr-2"></i>Governance</h1>
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4">Active Votes</h3>
        <div id="governance-votes"><div class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin"></i></div></div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="font-bold text-slate-800 mb-4">Actions</h3>
        <div class="space-y-2">
          <button onclick="showCreateVoteModal()" class="w-full btn-secondary text-sm text-left"><i class="fas fa-plus mr-2"></i>Create Proposal</button>
          <button onclick="processExpiredVotes()" class="w-full btn-secondary text-sm text-left"><i class="fas fa-clock mr-2"></i>Process Expired Votes</button>
          <button onclick="checkJozourTerms()" class="w-full btn-secondary text-sm text-left"><i class="fas fa-sync mr-2"></i>Check SHERKETI Terms</button>
          <button onclick="showDisputeModal()" class="w-full btn-secondary text-sm text-left"><i class="fas fa-exclamation-circle mr-2"></i>File Dispute</button>
          <button onclick="showEmergencyRecall()" class="w-full btn-secondary text-sm text-left text-red-600"><i class="fas fa-bolt mr-2"></i>Emergency Capital Recall</button>
        </div>
      </div>
    </div>
  </div>`;
}

async function loadGovernanceVotes() {
  const el = document.getElementById('governance-votes');
  if (!el) return;
  try {
    const data = await api('/api/governance/notifications');
    el.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Use project detail for vote-specific data</p>';
  } catch { el.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">No data</p>'; }
}

function showCreateVoteModal() {
  showModal('Create Proposal', `
    <div class="space-y-3">
      <div><label class="block text-sm font-medium mb-1">Project ID</label><input type="number" id="vote-pid" class="w-full px-3 py-2 rounded-xl border text-sm"></div>
      <div><label class="block text-sm font-medium mb-1">Title</label><input type="text" id="vote-title" class="w-full px-3 py-2 rounded-xl border text-sm"></div>
      <div><label class="block text-sm font-medium mb-1">Description</label><textarea id="vote-desc" rows="2" class="w-full px-3 py-2 rounded-xl border text-sm"></textarea></div>
      <div><label class="block text-sm font-medium mb-1">Type</label><select id="vote-type" class="w-full px-3 py-2 rounded-xl border text-sm">
        <option value="board_resolution">Board Resolution</option><option value="milestone_release">Milestone Release</option>
        <option value="constitutional_amendment">Constitutional Amendment</option><option value="manager_removal">Manager Removal</option>
      </select></div>
    </div>`,
    `<button onclick="closeModal()" class="btn-secondary text-sm">Cancel</button><button onclick="doCreateVote()" class="btn-primary text-sm">Create Vote</button>`);
}

async function doCreateVote() {
  try {
    await api('/api/governance/votes', { method: 'POST', body: JSON.stringify({
      project_id: +document.getElementById('vote-pid').value,
      title: document.getElementById('vote-title').value,
      description: document.getElementById('vote-desc').value,
      vote_type: document.getElementById('vote-type').value
    })});
    closeModal(); showToast('Proposal created');
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

async function processExpiredVotes() {
  try {
    const res = await api('/api/governance/process-expired-votes', { method: 'POST' });
    showToast(`Processed ${res.processed_count} expired votes`);
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

async function checkJozourTerms() {
  try {
    const res = await api('/api/governance/check-jozour-terms', { method: 'POST' });
    showToast(`Triggered ${res.triggered} renewal votes`);
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

function showDisputeModal() {
  showModal('File Dispute', `
    <div class="space-y-3">
      <div><label class="block text-sm font-medium mb-1">Project ID</label><input type="number" id="disp-pid" class="w-full px-3 py-2 rounded-xl border text-sm"></div>
      <div><label class="block text-sm font-medium mb-1">Dispute Type</label><select id="disp-type" class="w-full px-3 py-2 rounded-xl border text-sm">
        <option value="financial">Financial</option><option value="governance">Governance</option><option value="operational">Operational</option><option value="fraud">Fraud</option>
      </select></div>
      <div><label class="block text-sm font-medium mb-1">Description</label><textarea id="disp-desc" rows="3" class="w-full px-3 py-2 rounded-xl border text-sm"></textarea></div>
    </div>`,
    `<button onclick="closeModal()" class="btn-secondary text-sm">Cancel</button><button onclick="doFileDispute()" class="btn-danger text-sm">File Dispute</button>`);
}

async function doFileDispute() {
  try {
    await api('/api/governance/disputes', { method: 'POST', body: JSON.stringify({
      project_id: +document.getElementById('disp-pid').value,
      dispute_type: document.getElementById('disp-type').value,
      description: document.getElementById('disp-desc').value
    })});
    closeModal(); showToast('Dispute filed — 48hr AI mediation');
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

function showEmergencyRecall() {
  showModal('Emergency Capital Recall', `
    <div class="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700"><i class="fas fa-exclamation-triangle mr-1"></i>This will freeze all pending escrow and trigger a 72hr shareholder vote.</div>
    <div class="space-y-3">
      <div><label class="block text-sm font-medium mb-1">Project ID</label><input type="number" id="recall-pid" class="w-full px-3 py-2 rounded-xl border text-sm"></div>
      <div><label class="block text-sm font-medium mb-1">Reason</label><textarea id="recall-reason" rows="2" class="w-full px-3 py-2 rounded-xl border text-sm"></textarea></div>
    </div>`,
    `<button onclick="closeModal()" class="btn-secondary text-sm">Cancel</button><button onclick="doEmergencyRecall()" class="btn-danger text-sm">Initiate Recall</button>`);
}

async function doEmergencyRecall() {
  try {
    await api('/api/governance/emergency-recall', { method: 'POST', body: JSON.stringify({
      project_id: +document.getElementById('recall-pid').value,
      reason: document.getElementById('recall-reason').value
    })});
    closeModal(); showToast('Emergency recall initiated', 'warning');
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

// ==========================================================================
// CONSTITUTION
// ==========================================================================
function renderConstitution() {
  return `<div class="fade-in">
    <h1 class="text-2xl font-bold text-slate-800 mb-6"><i class="fas fa-scroll mr-2"></i>Constitution</h1>
    <div id="constitution-content"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div></div>
  </div>`;
}

async function loadConstitution() {
  const el = document.getElementById('constitution-content');
  if (!el) return;
  try {
    const data = await api('/api/constitution/rules');
    const rules = data.rules || [];
    el.innerHTML = `<div class="space-y-4">${rules.map((r, i) => `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 card-hover">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">${i + 1}</div>
          <h3 class="font-bold text-slate-800">${r.title || 'Rule ' + (i+1)}</h3>
        </div>
        <p class="text-sm text-slate-600">${r.description || r.content || JSON.stringify(r)}</p>
      </div>`).join('')}</div>`;
  } catch { el.innerHTML = '<p class="text-slate-400 text-center py-8">Failed to load constitution</p>'; }
}

// ==========================================================================
// AI TOOLS
// ==========================================================================
function renderAITools() {
  return `<div class="fade-in">
    <h1 class="text-2xl font-bold text-slate-800 mb-6"><i class="fas fa-robot mr-2"></i>AI Tools</h1>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${aiToolCard('fa-search-dollar', 'Feasibility Analysis', 'AI scores your business proposal 0-100', 'feasibility')}
      ${aiToolCard('fa-calculator', 'Valuation Engine', 'SHERKETI valuation v3 with sector multipliers', 'valuation')}
      ${aiToolCard('fa-money-check-alt', 'Salary Calculator', 'AI-calculated salary based on role & tier', 'salary')}
      ${aiToolCard('fa-star', 'Reputation Score', 'Calculate reputation for any user type', 'reputation')}
      ${aiToolCard('fa-shield-alt', 'Risk Assessment', 'AI risk prediction for projects', 'risk')}
      ${aiToolCard('fa-chart-bar', 'Fundamental Pricing', 'AI share pricing (Rule #9)', 'pricing')}
      ${aiToolCard('fa-receipt', 'Tax Calculator', 'Egyptian tax calculation (CG/Dividend/VAT)', 'tax')}
    </div>
    <div id="ai-result" class="mt-6"></div>
  </div>`;
}

function aiToolCard(icon, title, desc, tool) {
  return `<div class="bg-white rounded-2xl border border-slate-200 p-5 card-hover cursor-pointer" onclick="showAITool('${tool}')">
    <div class="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center mb-3"><i class="fas ${icon} text-accent-600"></i></div>
    <h3 class="font-bold text-sm text-slate-800 mb-1">${title}</h3>
    <p class="text-xs text-slate-500">${desc}</p>
  </div>`;
}

function showAITool(tool) {
  const forms = {
    feasibility: `<div class="space-y-3">
      <input type="text" id="ai-title" placeholder="Project Title" class="w-full px-3 py-2 rounded-xl border text-sm">
      <textarea id="ai-desc" placeholder="Description" rows="2" class="w-full px-3 py-2 rounded-xl border text-sm"></textarea>
      <select id="ai-sector" class="w-full px-3 py-2 rounded-xl border text-sm">${['Technology','FinTech','Green Energy','Healthcare','Food & Beverage'].map(s => `<option>${s}</option>`).join('')}</select>
      <input type="number" id="ai-goal" placeholder="Funding Goal (EGP)" class="w-full px-3 py-2 rounded-xl border text-sm">
      <select id="ai-tier" class="w-full px-3 py-2 rounded-xl border text-sm"><option>A</option><option>B</option><option>C</option><option>D</option></select>
      <button onclick="runAIFeasibility()" class="btn-primary w-full text-sm">Run Analysis</button>
    </div>`,
    valuation: `<div class="space-y-3">
      <input type="number" id="ai-val-goal" placeholder="Funding Goal (EGP)" class="w-full px-3 py-2 rounded-xl border text-sm">
      <select id="ai-val-sector" class="w-full px-3 py-2 rounded-xl border text-sm">${['Technology','FinTech','Green Energy','Healthcare','Food & Beverage'].map(s => `<option>${s}</option>`).join('')}</select>
      <select id="ai-val-tier" class="w-full px-3 py-2 rounded-xl border text-sm"><option>A</option><option>B</option><option>C</option><option>D</option></select>
      <input type="number" id="ai-val-score" placeholder="Feasibility Score" value="70" class="w-full px-3 py-2 rounded-xl border text-sm">
      <button onclick="runAIValuation()" class="btn-primary w-full text-sm">Calculate Valuation</button>
    </div>`,
    salary: `<div class="space-y-3">
      <select id="ai-sal-pos" class="w-full px-3 py-2 rounded-xl border text-sm">${['CEO/Founder','CTO','CFO','Manager','Senior Developer','Developer','Marketing Manager'].map(s => `<option>${s}</option>`).join('')}</select>
      <select id="ai-sal-tier" class="w-full px-3 py-2 rounded-xl border text-sm"><option>A</option><option>B</option><option>C</option><option>D</option></select>
      <input type="number" id="ai-sal-perf" placeholder="Milestone Achievement %" value="70" class="w-full px-3 py-2 rounded-xl border text-sm">
      <select id="ai-sal-region" class="w-full px-3 py-2 rounded-xl border text-sm"><option value="cairo">Cairo</option><option value="alexandria">Alexandria</option><option value="suez_canal">Suez Canal</option></select>
      <button onclick="runAISalary()" class="btn-primary w-full text-sm">Calculate Salary</button>
    </div>`,
    tax: `<div class="space-y-3">
      <input type="number" id="ai-tax-amt" placeholder="Amount (EGP)" class="w-full px-3 py-2 rounded-xl border text-sm">
      <select id="ai-tax-type" class="w-full px-3 py-2 rounded-xl border text-sm"><option value="capital_gains">Capital Gains</option><option value="dividend_withholding">Dividend Withholding</option><option value="vat">VAT</option></select>
      <select id="ai-tax-entity" class="w-full px-3 py-2 rounded-xl border text-sm"><option value="individual">Individual</option><option value="company">Company</option></select>
      <button onclick="runAITax()" class="btn-primary w-full text-sm">Calculate Tax</button>
    </div>`,
    reputation: `<div class="space-y-3">
      <select id="ai-rep-type" class="w-full px-3 py-2 rounded-xl border text-sm"><option value="investor">Investor</option><option value="founder">Founder</option><option value="board_member">Board Member</option></select>
      <p class="text-xs text-slate-500">Uses default metrics (50) for demo</p>
      <button onclick="runAIReputation()" class="btn-primary w-full text-sm">Calculate Reputation</button>
    </div>`,
    risk: `<div class="space-y-3">
      <input type="number" id="ai-risk-pid" placeholder="Project ID" class="w-full px-3 py-2 rounded-xl border text-sm">
      <button onclick="runAIRisk()" class="btn-primary w-full text-sm">Run Risk Assessment</button>
    </div>`,
    pricing: `<div class="space-y-3">
      <input type="number" id="ai-fp-eps" placeholder="EPS (Earnings Per Share)" class="w-full px-3 py-2 rounded-xl border text-sm">
      <input type="number" id="ai-fp-nav" placeholder="NAV per share" class="w-full px-3 py-2 rounded-xl border text-sm">
      <select id="ai-fp-sector" class="w-full px-3 py-2 rounded-xl border text-sm">${['Technology','FinTech','Food & Beverage','Real Estate'].map(s => `<option>${s}</option>`).join('')}</select>
      <input type="number" id="ai-fp-growth" placeholder="Growth Rate %" value="20" class="w-full px-3 py-2 rounded-xl border text-sm">
      <button onclick="runAIPricing()" class="btn-primary w-full text-sm">Calculate Price</button>
    </div>`
  };
  const el = document.getElementById('ai-result');
  if (el) el.innerHTML = `<div class="bg-white rounded-2xl border border-slate-200 p-5 fade-in"><h3 class="font-bold text-slate-800 mb-4">${tool.charAt(0).toUpperCase() + tool.slice(1)} Tool</h3>${forms[tool] || '<p>Coming soon</p>'}<div id="ai-output" class="mt-4"></div></div>`;
}

async function runAIFeasibility() { await runAI('/api/ai/feasibility', { title: gv('ai-title'), description: gv('ai-desc'), sector: gv('ai-sector'), funding_goal: +gv('ai-goal'), tier: gv('ai-tier') }); }
async function runAIValuation() { await runAI('/api/ai/valuation', { funding_goal: +gv('ai-val-goal'), sector: gv('ai-val-sector'), tier: gv('ai-val-tier'), feasibility_score: +gv('ai-val-score') }); }
async function runAISalary() { await runAI('/api/ai/salary', { position: gv('ai-sal-pos'), tier: gv('ai-sal-tier'), milestone_achievement: +gv('ai-sal-perf'), region: gv('ai-sal-region') }); }
async function runAITax() { await runAI('/api/ai/tax-calculate', { amount: +gv('ai-tax-amt'), tax_type: gv('ai-tax-type'), entity_type: gv('ai-tax-entity') }); }
async function runAIReputation() { await runAI('/api/ai/reputation', { user_type: gv('ai-rep-type'), metrics: { commitment_fulfillment: 70, payment_timeliness: 80, governance_participation: 60, project_profitability: 65, governance_compliance: 75, financial_transparency: 70, participation_quorum: 80, voting_quality: 70, dispute_resolution: 65, holding_period: 50, investment_diversity: 60, feedback_quality: 55, multiple_projects: 40, investor_satisfaction: 70, long_term_commitment: 65, strategic_contributions: 60, compliance_timeliness: 75 } }); }
async function runAIRisk() { await runAI('/api/ai/risk-assessment', { project_id: +gv('ai-risk-pid') }); }
async function runAIPricing() { await runAI('/api/ai/fundamental-price', { eps: +gv('ai-fp-eps'), nav_per_share: +gv('ai-fp-nav'), sector: gv('ai-fp-sector'), growth_rate: +gv('ai-fp-growth') }); }

function gv(id) { return document.getElementById(id)?.value || ''; }

async function runAI(endpoint, body) {
  const el = document.getElementById('ai-output');
  if (el) el.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-primary-500"></i> Analyzing...</div>';
  try {
    const data = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
    if (el) el.innerHTML = `<div class="bg-slate-50 rounded-xl p-4"><pre class="text-xs overflow-x-auto whitespace-pre-wrap">${JSON.stringify(data, null, 2)}</pre></div>`;
  } catch (e) {
    if (el) el.innerHTML = `<div class="bg-red-50 rounded-xl p-4 text-red-600 text-sm">${e.error || 'AI analysis failed'}</div>`;
  }
}

// ==========================================================================
// FINANCIAL
// ==========================================================================
function renderFinancial() {
  return `<div class="fade-in">
    <h1 class="text-2xl font-bold text-slate-800 mb-6"><i class="fas fa-money-bill-wave mr-2"></i>Financial</h1>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-5 card-hover cursor-pointer" onclick="showFinancialTool('report')">
        <i class="fas fa-file-invoice-dollar text-primary-500 text-2xl mb-3"></i>
        <h3 class="font-bold text-sm">Generate Report</h3>
        <p class="text-xs text-slate-500">Financial report for a project</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5 card-hover cursor-pointer" onclick="showFinancialTool('dividend')">
        <i class="fas fa-hand-holding-usd text-emerald-500 text-2xl mb-3"></i>
        <h3 class="font-bold text-sm">Distribute Dividends</h3>
        <p class="text-xs text-slate-500">With 10% withholding tax</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5 card-hover cursor-pointer" onclick="showFinancialTool('dashboard')">
        <i class="fas fa-tachometer-alt text-amber-500 text-2xl mb-3"></i>
        <h3 class="font-bold text-sm">Financial Dashboard</h3>
        <p class="text-xs text-slate-500">Real-time project metrics</p>
      </div>
    </div>
    <div id="financial-result"></div>
  </div>`;
}

function showFinancialTool(tool) {
  const el = document.getElementById('financial-result');
  if (!el) return;
  const forms = {
    report: `<div class="space-y-3">
      <input type="number" id="fin-pid" placeholder="Project ID" class="w-full px-3 py-2 rounded-xl border text-sm">
      <select id="fin-period" class="w-full px-3 py-2 rounded-xl border text-sm"><option value="quarterly">Quarterly</option><option value="semi_annual">Semi-Annual</option><option value="annual">Annual</option></select>
      <button onclick="runFinReport()" class="btn-primary w-full text-sm">Generate Report</button></div>`,
    dividend: `<div class="space-y-3">
      <input type="number" id="div-pid" placeholder="Project ID" class="w-full px-3 py-2 rounded-xl border text-sm">
      <input type="number" id="div-amt" placeholder="Total Dividend (EGP)" class="w-full px-3 py-2 rounded-xl border text-sm">
      <input type="text" id="div-period" placeholder="Period (e.g. Q1 2026)" class="w-full px-3 py-2 rounded-xl border text-sm">
      <button onclick="runDividend()" class="btn-primary w-full text-sm">Distribute</button></div>`,
    dashboard: `<div class="space-y-3">
      <input type="number" id="fdash-pid" placeholder="Project ID" class="w-full px-3 py-2 rounded-xl border text-sm">
      <button onclick="runFinDash()" class="btn-primary w-full text-sm">Load Dashboard</button></div>`
  };
  el.innerHTML = `<div class="bg-white rounded-2xl border border-slate-200 p-5 fade-in">${forms[tool]}<div id="fin-output" class="mt-4"></div></div>`;
}

async function runFinReport() { await runAI('/api/financial/report/generate', { project_id: +gv('fin-pid'), period_type: gv('fin-period') }); }
async function runDividend() { await runAI('/api/financial/dividend/distribute', { project_id: +gv('div-pid'), total_amount: +gv('div-amt'), period: gv('div-period') }); }
async function runFinDash() {
  const el = document.getElementById('ai-output') || document.getElementById('fin-output');
  if (el) el.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-primary-500"></i></div>';
  try {
    const data = await api(`/api/financial/dashboard/${gv('fdash-pid')}`);
    if (el) el.innerHTML = `<div class="bg-slate-50 rounded-xl p-4"><pre class="text-xs overflow-x-auto whitespace-pre-wrap">${JSON.stringify(data, null, 2)}</pre></div>`;
  } catch (e) { if (el) el.innerHTML = `<div class="text-red-500 text-sm">${e.error || 'Failed'}</div>`; }
}

// ==========================================================================
// BOARD OPERATIONS
// ==========================================================================
function renderBoardOps() {
  return `<div class="fade-in">
    <h1 class="text-2xl font-bold text-slate-800 mb-6"><i class="fas fa-users-cog mr-2"></i>Board Operations</h1>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${[
        { icon:'fa-calendar-alt', title:'Meetings', fn:'meetings' },
        { icon:'fa-star', title:'Performance', fn:'performance' },
        { icon:'fa-file-contract', title:'Contracts', fn:'contracts' },
        { icon:'fa-globe', title:'Reputation', fn:'reputation' },
        { icon:'fa-exclamation-triangle', title:'Early Warning', fn:'warning' },
        { icon:'fa-exchange-alt', title:'Equity Conversion', fn:'equity' },
        { icon:'fa-balance-scale', title:'Dispute Prediction', fn:'dispute' },
        { icon:'fa-chart-pie', title:'Market Intelligence', fn:'market' }
      ].map(t => `<div class="bg-white rounded-2xl border border-slate-200 p-4 card-hover cursor-pointer" onclick="showBoardTool('${t.fn}')">
        <i class="fas ${t.icon} text-primary-500 text-lg mb-2"></i>
        <h3 class="font-bold text-xs">${t.title}</h3>
      </div>`).join('')}
    </div>
    <div id="board-result"></div>
  </div>`;
}

function showBoardTool(tool) {
  const el = document.getElementById('board-result');
  if (!el) return;
  const pid = `<input type="number" id="bo-pid" placeholder="Project ID" class="w-full px-3 py-2 rounded-xl border text-sm mb-3">`;
  const toolForms = {
    meetings: `${pid}<button onclick="runBoardOp('/api/board-ops/meetings/' + gv('bo-pid'), 'GET')" class="btn-primary w-full text-sm mb-2">View Meetings</button>
      <button onclick="runBoardOp('/api/board-ops/meetings/schedule', 'POST', { project_id: +gv('bo-pid'), meeting_type: 'quarterly' })" class="btn-secondary w-full text-sm">Schedule Meeting</button>`,
    performance: `${pid}<button onclick="runBoardOp('/api/board-ops/performance-evaluation', 'POST', { project_id: +gv('bo-pid') })" class="btn-primary w-full text-sm">Run Evaluation</button>`,
    contracts: `${pid}<input type="text" id="bo-contract" placeholder="Contract Title" class="w-full px-3 py-2 rounded-xl border text-sm mb-3">
      <input type="number" id="bo-cvalue" placeholder="Value (EGP)" class="w-full px-3 py-2 rounded-xl border text-sm mb-3">
      <button onclick="runBoardOp('/api/board-ops/contract/review', 'POST', { project_id: +gv('bo-pid'), contract_title: gv('bo-contract'), contract_value: +gv('bo-cvalue'), duration_months: 12 })" class="btn-primary w-full text-sm">Review Contract</button>`,
    reputation: `<input type="number" id="bo-uid" placeholder="User ID" class="w-full px-3 py-2 rounded-xl border text-sm mb-3">
      <button onclick="runBoardOp('/api/board-ops/reputation/global', 'POST', { user_id: +gv('bo-uid') })" class="btn-primary w-full text-sm">Calculate</button>`,
    warning: `${pid}<button onclick="runBoardOp('/api/board-ops/early-warning', 'POST', { project_id: +gv('bo-pid') })" class="btn-primary w-full text-sm">Scan</button>`,
    equity: `${pid}<input type="number" id="bo-emp" placeholder="Employee User ID" class="w-full px-3 py-2 rounded-xl border text-sm mb-3">
      <input type="number" id="bo-sal" placeholder="Monthly Salary" class="w-full px-3 py-2 rounded-xl border text-sm mb-3">
      <input type="number" id="bo-convpct" placeholder="Conversion % (max 10)" value="5" class="w-full px-3 py-2 rounded-xl border text-sm mb-3">
      <button onclick="runBoardOp('/api/board-ops/employee-equity-conversion', 'POST', { project_id: +gv('bo-pid'), employee_id: +gv('bo-emp'), current_salary: +gv('bo-sal'), conversion_percentage: +gv('bo-convpct') })" class="btn-primary w-full text-sm">Convert</button>`,
    dispute: `${pid}<button onclick="runBoardOp('/api/board-ops/dispute-prediction', 'POST', { project_id: +gv('bo-pid') })" class="btn-primary w-full text-sm">Predict</button>`,
    market: `${pid}<button onclick="runBoardOp('/api/board-ops/market-intelligence', 'POST', { project_id: +gv('bo-pid') })" class="btn-primary w-full text-sm">Analyze</button>`
  };
  el.innerHTML = `<div class="bg-white rounded-2xl border border-slate-200 p-5 fade-in max-w-lg">${toolForms[tool] || 'Coming soon'}<div id="bo-output" class="mt-4"></div></div>`;
}

async function runBoardOp(endpoint, method, body) {
  const el = document.getElementById('bo-output');
  if (el) el.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-primary-500"></i></div>';
  try {
    const opts = { method };
    if (body) opts.body = JSON.stringify(body);
    const data = await api(endpoint, opts);
    if (el) el.innerHTML = `<div class="bg-slate-50 rounded-xl p-4"><pre class="text-xs overflow-x-auto whitespace-pre-wrap">${JSON.stringify(data, null, 2)}</pre></div>`;
  } catch (e) { if (el) el.innerHTML = `<div class="text-red-500 text-sm">${e.error || 'Failed'}</div>`; }
}

// ==========================================================================
// ADD-ONS
// ==========================================================================
function renderAddons() {
  return `<div class="fade-in">
    <h1 class="text-2xl font-bold text-slate-800 mb-6"><i class="fas fa-puzzle-piece mr-2"></i>Add-ons</h1>
    <div id="addons-content"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div></div>
  </div>`;
}

async function loadAddons() {
  const el = document.getElementById('addons-content');
  if (!el) return;
  try {
    const data = await api('/api/addons');
    const addons = data.addons || [];
    el.innerHTML = `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${addons.map(a => `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 card-hover">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-primary-600">#${a.id}</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${a.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${a.enabled ? 'Active' : 'Inactive'}</span>
        </div>
        <h3 class="font-bold text-sm text-slate-800 mb-1">${a.title || a.name || 'Add-on'}</h3>
        <p class="text-xs text-slate-500">${a.description || ''}</p>
      </div>`).join('')}</div>`;
  } catch { el.innerHTML = '<p class="text-slate-400 text-center py-8">Failed to load add-ons</p>'; }
}

// ==========================================================================
// ADMIN PANEL
// ==========================================================================
function renderAdmin() {
  return `<div class="fade-in">
    <h1 class="text-2xl font-bold text-slate-800 mb-6"><i class="fas fa-shield-alt mr-2"></i>Admin Panel</h1>
    <div class="flex gap-2 mb-6 flex-wrap">
      ${['overview','users','projects','audit'].map(t => 
        `<button onclick="loadAdminTab('${t}')" class="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 hover:bg-primary-50 hover:border-primary-200">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`
      ).join('')}
    </div>
    <div id="admin-content"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div></div>
  </div>`;
}

async function loadAdminTab(tab) {
  const el = document.getElementById('admin-content');
  if (!el) return;
  el.innerHTML = '<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div>';
  try {
    const data = await api(`/api/admin/${tab}`);
    if (tab === 'overview') {
      const d = data;
      el.innerHTML = `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${statCard('fa-users', 'Users', d.total_users || 0, 'primary')}
        ${statCard('fa-folder', 'Projects', d.total_projects || 0, 'emerald')}
        ${statCard('fa-money-bill', 'Raised', fEGP(d.total_raised), 'accent')}
        ${statCard('fa-exclamation-circle', 'Active Alerts', d.active_alerts || 0, 'red')}
      </div>`;
    } else if (tab === 'users') {
      const users = data.users || [];
      el.innerHTML = `<div class="bg-white rounded-2xl border overflow-hidden"><table class="w-full text-sm">
        <thead><tr class="bg-slate-50 text-left text-xs text-slate-500"><th class="px-4 py-3">ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Reputation</th></tr></thead>
        <tbody>${users.map(u => `<tr class="border-t border-slate-100"><td class="px-4 py-2">${u.id}</td><td>${u.full_name}</td><td class="text-xs">${u.email}</td><td><span class="capitalize text-xs">${u.role}</span></td><td>${u.verification_status}</td><td>${u.reputation_score || 50}</td></tr>`).join('')}</tbody>
      </table></div>`;
    } else if (tab === 'projects') {
      const projects = data.projects || [];
      el.innerHTML = `<div class="bg-white rounded-2xl border overflow-hidden"><table class="w-full text-sm">
        <thead><tr class="bg-slate-50 text-left text-xs text-slate-500"><th class="px-4 py-3">ID</th><th>Title</th><th>Tier</th><th>Status</th><th>Raised</th><th>Goal</th></tr></thead>
        <tbody>${projects.map(p => `<tr class="border-t border-slate-100 cursor-pointer hover:bg-slate-50" onclick="navigate('project-detail',{id:${p.id}})"><td class="px-4 py-2">${p.id}</td><td>${p.title}</td><td>${tierBadge(p.tier)}</td><td>${p.status}</td><td>${fEGP(p.funding_raised)}</td><td>${fEGP(p.funding_goal)}</td></tr>`).join('')}</tbody>
      </table></div>`;
    } else {
      const log = data.audit_log || data.logs || [];
      el.innerHTML = `<div class="bg-white rounded-2xl border overflow-hidden max-h-96 overflow-y-auto"><table class="w-full text-xs">
        <thead class="sticky top-0 bg-slate-50"><tr class="text-left text-slate-500"><th class="px-3 py-2">Action</th><th>Entity</th><th>Actor</th><th>Time</th></tr></thead>
        <tbody>${(Array.isArray(log) ? log : []).map(l => `<tr class="border-t border-slate-100"><td class="px-3 py-1.5">${l.action}</td><td>${l.entity_type}#${l.entity_id}</td><td>${l.actor_id || 'System'}</td><td>${timeAgo(l.created_at)}</td></tr>`).join('')}</tbody>
      </table></div>`;
    }
  } catch (e) { el.innerHTML = `<div class="text-red-500 text-center py-8">Failed to load: ${e.error || e.message || ''}</div>`; }
}

// ==========================================================================
// NOTIFICATIONS
// ==========================================================================
function renderNotifications() {
  return `<div class="fade-in">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-slate-800"><i class="fas fa-bell mr-2"></i>Notifications</h1>
      <button onclick="markAllRead()" class="btn-secondary text-sm"><i class="fas fa-check-double mr-1"></i>Mark All Read</button>
    </div>
    <div id="notif-list"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-primary-500 text-2xl"></i></div></div>
  </div>`;
}

async function loadNotifications() {
  const el = document.getElementById('notif-list');
  if (!el) return;
  try {
    const data = await api('/api/governance/notifications');
    const notifs = data.notifications || [];
    // Update badge
    const badge = document.getElementById('notif-badge');
    if (badge && data.unread > 0) { badge.textContent = data.unread; badge.classList.remove('hidden'); }
    
    el.innerHTML = notifs.length === 0 ? '<p class="text-slate-400 text-center py-16">No notifications</p>' :
      `<div class="space-y-2">${notifs.map(n => `
        <div class="flex items-start gap-3 p-4 rounded-xl ${n.read_status ? 'bg-white' : 'bg-primary-50'} border border-slate-200">
          <div class="w-8 h-8 rounded-lg bg-${n.notification_type === 'emergency' ? 'red' : 'primary'}-100 flex items-center justify-center flex-shrink-0">
            <i class="fas ${n.notification_type === 'emergency' ? 'fa-exclamation-triangle text-red-500' : 'fa-bell text-primary-500'} text-sm"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-slate-800">${n.title}</div>
            <p class="text-xs text-slate-500 mt-0.5">${n.message || ''}</p>
            <div class="text-xs text-slate-400 mt-1">${n.project_title ? n.project_title + ' — ' : ''}${timeAgo(n.created_at)}</div>
          </div>
          ${!n.read_status ? `<button onclick="markRead(${n.id})" class="text-xs text-primary-600 hover:underline flex-shrink-0">Mark read</button>` : ''}
        </div>`).join('')}</div>`;
  } catch { el.innerHTML = '<p class="text-slate-400 text-center py-8">Failed to load</p>'; }
}

async function markRead(id) { try { await api(`/api/governance/notifications/${id}/read`, { method: 'POST' }); loadNotifications(); } catch {} }
async function markAllRead() { try { await api('/api/governance/notifications/read-all', { method: 'POST' }); showToast('All marked read'); loadNotifications(); } catch {} }

// ==========================================================================
// PROFILE
// ==========================================================================
function renderProfile() {
  if (!currentUser) return '';
  const u = currentUser;
  return `<div class="fade-in max-w-2xl mx-auto">
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white font-bold text-2xl">${(u.full_name || 'U').charAt(0)}</div>
        <div>
          <h2 class="text-xl font-bold text-slate-800">${u.full_name}</h2>
          ${u.full_name_ar ? `<p class="text-sm text-slate-600 ar-text">${u.full_name_ar}</p>` : ''}
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 capitalize">${u.role}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${u.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${u.verification_status || 'pending'}</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        ${miniStat('Email', u.email)}
        ${miniStat('Region', u.region || '—')}
        ${miniStat('KYC Level', u.kyc_level || 0)}
        ${miniStat('Reputation', (u.reputation_score || 50) + '/100')}
        ${miniStat('AML Cleared', u.aml_cleared ? 'Yes' : 'No')}
        ${miniStat('Joined', fDate(u.created_at))}
      </div>
      ${u.verification_status !== 'verified' ? `
        <div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p class="text-sm text-amber-700 mb-3"><i class="fas fa-id-card mr-1"></i>Complete KYC to invest</p>
          <button onclick="autoApproveKYC()" class="btn-primary text-sm"><i class="fas fa-check mr-1"></i>Auto-Approve KYC (Demo)</button>
        </div>` : ''}
    </div>
  </div>`;
}

async function autoApproveKYC() {
  try {
    await api('/api/auth/kyc/auto-approve', { method: 'POST' });
    const data = await api('/api/auth/me');
    currentUser = data.user;
    showToast('KYC approved');
    render();
  } catch (e) { showToast(e.error || 'Failed', 'error'); }
}

// ==========================================================================
// EVENT BINDING
// ==========================================================================
function bindEvents() {
  // Login form
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-password').value })
      });
      token = data.token;
      localStorage.setItem('sherketi_token', token);
      currentUser = data.user;
      showToast('Welcome back, ' + (currentUser?.full_name || 'User'));
      navigate('dashboard');
    } catch (e) {
      if (errEl) { errEl.textContent = e.error || 'Login failed'; errEl.classList.remove('hidden'); }
    }
  });

  // Register form
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value,
          full_name: document.getElementById('reg-name').value,
          full_name_ar: document.getElementById('reg-name-ar').value,
          role: document.getElementById('reg-role').value,
          region: document.getElementById('reg-region').value,
          national_id: document.getElementById('reg-nid').value,
          user_type: document.getElementById('reg-role').value
        })
      });
      token = data.token;
      localStorage.setItem('sherketi_token', token);
      currentUser = { full_name: document.getElementById('reg-name').value, role: document.getElementById('reg-role').value, email: document.getElementById('reg-email').value };
      showToast('Account created!');
      navigate('dashboard');
    } catch (e) {
      if (errEl) { errEl.textContent = e.error || 'Registration failed'; errEl.classList.remove('hidden'); }
    }
  });

  // Create project form
  document.getElementById('create-project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('cp-title').value,
          title_ar: document.getElementById('cp-title-ar').value,
          description: document.getElementById('cp-desc').value,
          sector: document.getElementById('cp-sector').value,
          tier: document.getElementById('cp-tier').value,
          funding_goal: +document.getElementById('cp-goal').value,
          equity_offered: +document.getElementById('cp-equity').value
        })
      });
      showToast('Project created! Submitting for AI review...');
      // Auto-submit for AI review
      try {
        const review = await api(`/api/projects/${data.projectId}/submit-review`, { method: 'POST' });
        showToast(`AI Score: ${review.score}/100 — ${review.message}`);
      } catch (re) { showToast(re.error || 'AI review issue', 'warning'); }
      navigate('projects');
    } catch (e) { showToast(e.error || 'Failed', 'error'); }
  });

  // Auto-load page data
  if (currentPage === 'dashboard') loadDashboard();
  if (currentPage === 'projects') loadProjects();
  if (currentPage === 'project-detail' && pageParams.id) loadProjectDetail(pageParams.id);
  if (currentPage === 'market') loadMarket();
  if (currentPage === 'governance') loadGovernanceVotes();
  if (currentPage === 'constitution') loadConstitution();
  if (currentPage === 'addons') loadAddons();
  if (currentPage === 'admin') loadAdminTab('overview');
  if (currentPage === 'notifications') loadNotifications();
  
  // Load platform stats on landing
  if (currentPage === 'landing') {
    api('/api/dashboard/platform-stats').then(data => {
      const el = document.getElementById('platform-stats');
      if (el) el.innerHTML = `
        ${landingStat('fa-folder-open', data.total_projects || 0, 'Projects')}
        ${landingStat('fa-users', data.total_investors || 0, 'Investors')}
        ${landingStat('fa-money-bill-wave', fEGP(data.total_raised || 0), 'Raised')}
        ${landingStat('fa-chart-line', data.active_projects || 0, 'Active')}
      `;
    }).catch(() => {});
  }
}

function landingStat(icon, value, label) {
  return `<div class="glass rounded-xl p-4 text-center">
    <i class="fas ${icon} text-white/60 mb-1"></i>
    <div class="text-xl font-bold text-white">${value}</div>
    <div class="text-xs text-white/60">${label}</div>
  </div>`;
}

// ---------- Boot ----------
init();
