// SHERKETI Platform v2.0 — Complete Frontend Application
// AI-Governed Equity Crowdfunding Platform for Egypt
// JOZOUR Model: 2.5% Commission + 2.5% Equity + 5yr Board Seat (Tiers A/B/C)

const API = '';
let currentUser = null;
let currentToken = localStorage.getItem('sherketi_token');
let currentPage = 'landing';
let platformStats = null;

// ============ API Helper ============
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
  } catch (e) { console.error('API Error:', e); throw e; }
}

// ============ State ============
function setState(key, value) { window._state = window._state || {}; window._state[key] = value; }
function getState(key) { return (window._state || {})[key]; }

// ============ Router ============
function navigate(page, params = {}) {
  currentPage = page;
  setState('params', params);
  render();
  window.scrollTo(0, 0);
}

// ============ Formatters ============
function formatEGP(amount) {
  if (!amount && amount !== 0) return '0 EGP';
  return new Intl.NumberFormat('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' EGP';
}
function formatPercent(val) { return (val || 0).toFixed(2) + '%'; }
function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago'; return Math.floor(s/86400) + 'd ago';
}
function tierColor(t) { return { A:'emerald',B:'blue',C:'purple',D:'amber' }[t] || 'gray'; }
function statusIcon(status) {
  const m = { active:'fa-circle-check text-emerald-500', funded:'fa-circle-check text-emerald-500', live_fundraising:'fa-signal text-blue-500', interest_phase:'fa-eye text-amber-500', draft:'fa-file-pen text-slate-400', frozen:'fa-snowflake text-red-500', rejected:'fa-circle-xmark text-red-500', dissolved:'fa-ban text-slate-500', ai_review:'fa-robot text-purple-500', operational:'fa-gear text-emerald-500' };
  return m[status] || 'fa-circle text-slate-400';
}
function roleLabel(r) {
  const m = { investor:'Investor', founder:'Founder', manager:'Manager', accountant:'Accountant', law_firm:'Law Firm', admin:'JOZOUR Admin', regulator:'FRA Regulator' };
  return m[r] || r;
}
function boardRoleLabel(r) {
  const m = { founder_rep:'Founder Rep', manager:'Manager', independent_accountant:'Accountant', shareholder_rep:'Shareholder Rep', jozour_observer:'JOZOUR Observer' };
  return m[r] || r;
}

// ============ Init ============
async function init() {
  if (currentToken) {
    try {
      const data = await api('/api/auth/me');
      currentUser = data.user;
      navigate('dashboard');
    } catch { currentToken = null; localStorage.removeItem('sherketi_token'); navigate('landing'); }
  } else { navigate('landing'); }
  try { platformStats = await api('/api/dashboard/platform-stats'); } catch {}
}

// ============ Main Render ============
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  let html = '';
  switch(currentPage) {
    case 'landing': html = renderLanding(); break;
    case 'login': html = renderAuth('login'); break;
    case 'register': html = renderAuth('register'); break;
    case 'dashboard': html = renderDashboard(); break;
    case 'projects': html = renderProjectsList(); break;
    case 'project-detail': html = renderProjectDetail(); break;
    case 'create-project': html = renderCreateProject(); break;
    case 'constitution': html = renderConstitution(); break;
    case 'market': html = renderSecondaryMarket(); break;
    case 'admin': html = renderAdmin(); break;
    case 'ai-tools': html = renderAITools(); break;
    case 'notifications': html = renderNotifications(); break;
    default: html = renderLanding();
  }
  app.innerHTML = html;
  attachEvents();
}

// ============ Nav ============
function renderNav() {
  const isLoggedIn = !!currentUser;
  return `
  <nav class="glass fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-3 cursor-pointer" onclick="navigate('${isLoggedIn?'dashboard':'landing'}')">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <i class="fas fa-shield-halved text-white text-lg"></i>
          </div>
          <div><span class="text-xl font-bold gradient-text">SHERKETI</span><span class="text-[10px] text-slate-500 block -mt-1 font-cairo">شركتي</span></div>
        </div>
        <div class="hidden md:flex items-center gap-1">
          <a onclick="navigate('projects')" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-all"><i class="fas fa-rocket mr-1"></i>Projects</a>
          <a onclick="navigate('constitution')" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-all"><i class="fas fa-scroll mr-1"></i>Constitution</a>
          <a onclick="navigate('market')" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-all"><i class="fas fa-chart-line mr-1"></i>Market</a>
          ${isLoggedIn ? `
          <a onclick="navigate('ai-tools')" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-all"><i class="fas fa-brain mr-1"></i>AI Tools</a>
          ${currentUser?.role==='admin'?`<a onclick="navigate('admin')" class="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer transition-all"><i class="fas fa-cog mr-1"></i>Admin</a>`:''}
          ` : ''}
        </div>
        <div class="flex items-center gap-3">
          ${isLoggedIn ? `
            <button onclick="navigate('notifications')" class="relative text-slate-500 hover:text-blue-600 p-2"><i class="fas fa-bell"></i><span id="notifBadge" class="hidden absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center"></span></button>
            <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <div class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">${(currentUser.full_name||'U')[0]}</div>
              <div class="text-xs">
                <div class="font-semibold text-slate-800">${currentUser.full_name}</div>
                <div class="text-slate-500 capitalize">${roleLabel(currentUser.role)} <span class="text-amber-600">${currentUser.reputation_score}★</span></div>
              </div>
            </div>
            <button onclick="navigate('dashboard')" class="btn-primary text-xs py-2 px-3"><i class="fas fa-chart-pie mr-1"></i>Dashboard</button>
            <button onclick="logout()" class="text-slate-400 hover:text-red-500 transition-colors" title="Logout"><i class="fas fa-sign-out-alt"></i></button>
          ` : `
            <button onclick="navigate('login')" class="btn-secondary text-sm">Log In</button>
            <button onclick="navigate('register')" class="btn-primary text-sm">Get Started</button>
          `}
        </div>
      </div>
    </div>
  </nav>`;
}

// ============ Landing ============
function renderLanding() {
  const s = platformStats || { total_projects:3, total_investors:4, total_raised:30000000, active_projects:3 };
  return `${renderNav()}
  <div class="hero-gradient pt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
      <div class="text-center fade-in">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-blue-200 text-sm mb-6 backdrop-blur"><i class="fas fa-shield-halved"></i><span>Constitutionally Governed Equity Platform</span></div>
        <h1 class="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">Democratize Private<br><span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Company Ownership</span></h1>
        <p class="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto mb-4 leading-relaxed">Invest in Egyptian LLCs from <strong class="text-white">50 EGP</strong>. Protected by zero-custody architecture, AI-locked governance, and licensed law-firm escrow.</p>
        <p class="ar-text text-xl text-blue-200 mb-10 font-cairo">شركتي - استثمر في الشركات المصرية من ٥٠ جنيه</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button onclick="navigate('register')" class="px-8 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-xl"><i class="fas fa-rocket mr-2"></i>Start Investing</button>
          <button onclick="navigate('projects')" class="px-8 py-4 bg-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all backdrop-blur border border-white/20"><i class="fas fa-search mr-2"></i>Explore Projects</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          ${[{icon:'fa-building',value:s.total_projects,label:'Projects',color:'blue'},{icon:'fa-users',value:s.total_investors,label:'Investors',color:'purple'},{icon:'fa-coins',value:formatEGP(s.total_raised),label:'Total Raised',color:'emerald'},{icon:'fa-chart-line',value:s.active_projects,label:'Active',color:'amber'}].map(x=>`
            <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <i class="fas ${x.icon} text-2xl text-${x.color}-400 mb-2"></i>
              <div class="text-2xl font-bold text-white">${x.value}</div>
              <div class="text-sm text-blue-200">${x.label}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <!-- JOZOUR Fee Model Section -->
  <div class="bg-gradient-to-r from-blue-900 to-purple-900 py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <h2 class="text-3xl font-bold text-center text-white mb-3"><i class="fas fa-hand-holding-dollar text-amber-400 mr-2"></i>JOZOUR Compensation Model</h2>
      <p class="text-center text-blue-200 mb-10 max-w-2xl mx-auto">Transparent, constitutional fee structure. No hidden costs.</p>
      <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
        <div class="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10 text-center">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><i class="fas fa-percentage text-3xl text-emerald-400"></i></div>
          <div class="text-3xl font-black text-white mb-1">2.5%</div>
          <div class="text-emerald-300 font-semibold">Cash Commission</div>
          <p class="text-blue-200 text-sm mt-2">Deducted from escrow at funding completion. Applies to ALL tiers.</p>
        </div>
        <div class="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10 text-center">
          <div class="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4"><i class="fas fa-chart-pie text-3xl text-purple-400"></i></div>
          <div class="text-3xl font-black text-white mb-1">2.5%</div>
          <div class="text-purple-300 font-semibold">Equity Stake</div>
          <p class="text-blue-200 text-sm mt-2">JOZOUR receives equity in every project. Tiers A, B, C only. Not Tier D.</p>
        </div>
        <div class="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10 text-center">
          <div class="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4"><i class="fas fa-user-shield text-3xl text-amber-400"></i></div>
          <div class="text-3xl font-black text-white mb-1">5 Yr</div>
          <div class="text-amber-300 font-semibold">Board Seat + Veto</div>
          <p class="text-blue-200 text-sm mt-2">Guaranteed board seat with veto on illegal actions. Voted on renewal after 5 years.</p>
        </div>
      </div>
      <div class="text-center"><p class="text-blue-200 text-sm"><i class="fas fa-info-circle mr-1"></i>Tier D (existing companies): 2.5% commission only. No equity, no board seat.</p></div>
    </div>
  </div>
  <!-- How It Works -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-20">
    <h2 class="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">How SHERKETI Works</h2>
    <div class="grid md:grid-cols-5 gap-4">
      ${[{step:1,icon:'fa-id-card',title:'Verify ID',desc:'AI KYC with liveness detection',color:'blue'},{step:2,icon:'fa-robot',title:'AI Review',desc:'Feasibility scoring & valuation',color:'purple'},{step:3,icon:'fa-eye',title:'Interest Phase',desc:'14-day investor interest gauge',color:'amber'},{step:4,icon:'fa-hand-holding-dollar',title:'Invest',desc:'Funds to law-firm escrow',color:'emerald'},{step:5,icon:'fa-gavel',title:'Govern',desc:'AI-locked voting & milestones',color:'red'}].map(x=>`
        <div class="card-hover bg-white rounded-2xl p-5 border border-slate-200 relative text-center">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-${x.color}-500 text-white font-bold flex items-center justify-center text-xs">${x.step}</div>
          <div class="w-12 h-12 rounded-xl bg-${x.color}-100 flex items-center justify-center mx-auto mb-3"><i class="fas ${x.icon} text-xl text-${x.color}-600"></i></div>
          <h3 class="font-bold text-slate-800 mb-1 text-sm">${x.title}</h3>
          <p class="text-xs text-slate-500">${x.desc}</p>
        </div>`).join('')}
    </div>
  </div>
  <!-- Constitutional Pillars -->
  <div class="bg-slate-900 py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <h2 class="text-3xl font-bold text-center text-white mb-12"><i class="fas fa-shield-halved text-blue-400 mr-2"></i>8 Immutable Constitutional Rules</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${[{icon:'fa-vault',title:'Zero Custody',desc:'Platform never holds funds'},{icon:'fa-building-columns',title:'Escrow Only',desc:'Licensed law-firm accounts'},{icon:'fa-lock',title:'AI-Locked',desc:'Immutable governance rules'},{icon:'fa-user-shield',title:'Human-Proof',desc:'No override capability'},{icon:'fa-link',title:'Immutable Audit',desc:'Hash-chained ledger'},{icon:'fa-fingerprint',title:'One Identity',desc:'One ID per person forever'},{icon:'fa-eye',title:'Transparency',desc:'Public constitutional rules'},{icon:'fa-scale-balanced',title:'JOZOUR Model',desc:'2.5% cash + 2.5% equity'}].map(r=>`
          <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-blue-500/50 transition-all">
            <div class="flex items-center gap-3 mb-2"><div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><i class="fas ${r.icon} text-blue-400"></i></div><h4 class="font-bold text-white">${r.title}</h4></div>
            <p class="text-sm text-slate-400">${r.desc}</p>
          </div>`).join('')}
      </div>
    </div>
  </div>
  <!-- Project Tiers -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-20">
    <h2 class="text-3xl font-bold text-center text-slate-800 mb-12">Investment Tiers</h2>
    <div class="grid md:grid-cols-4 gap-6">
      ${[{tier:'A',name:'Seed',desc:'New Idea, No Experience',max:'3M EGP',comm:'2.5%',eq:'2.5%',board:'5yr + Veto',icon:'fa-seedling'},{tier:'B',name:'Growth',desc:'Medium Experience',max:'25M EGP',comm:'2.5%',eq:'2.5%',board:'5yr + Veto',icon:'fa-chart-line'},{tier:'C',name:'Expert',desc:'Expert Founder',max:'Unlimited',comm:'2.5%',eq:'2.5%',board:'5yr + Veto',icon:'fa-crown'},{tier:'D',name:'Expansion',desc:'Existing Company',max:'Unlimited',comm:'2.5%',eq:'0%',board:'None',icon:'fa-building'}].map(t=>`
        <div class="card-hover bg-white rounded-2xl overflow-hidden border border-slate-200">
          <div class="tier-badge-${t.tier} p-4 text-center">
            <i class="fas ${t.icon} text-3xl text-white mb-2"></i>
            <div class="text-2xl font-black text-white">Tier ${t.tier}</div>
            <div class="text-white/80 text-sm">${t.name}</div>
          </div>
          <div class="p-5">
            <p class="text-sm text-slate-600 mb-3">${t.desc}</p>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-slate-500">Max Raise</span><span class="font-bold">${t.max}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Commission</span><span class="font-bold text-emerald-600">${t.comm}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Equity</span><span class="font-bold text-purple-600">${t.eq}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Board Seat</span><span class="font-bold text-amber-600">${t.board}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Min. Investment</span><span class="font-bold">50 EGP</span></div>
            </div>
          </div>
        </div>`).join('')}
    </div>
  </div>
  <footer class="bg-slate-900 text-slate-400 py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="grid md:grid-cols-4 gap-8 mb-8">
        <div><div class="flex items-center gap-2 mb-4"><div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"><i class="fas fa-shield-halved text-white text-sm"></i></div><span class="text-lg font-bold text-white">SHERKETI</span></div><p class="text-sm">AI-governed equity crowdfunding for Egypt. 2.5% commission + 2.5% equity model.</p></div>
        <div><h4 class="font-bold text-white mb-3">Platform</h4><ul class="space-y-2 text-sm"><li><a onclick="navigate('projects')" class="hover:text-blue-400 cursor-pointer">Explore Projects</a></li><li><a onclick="navigate('constitution')" class="hover:text-blue-400 cursor-pointer">Constitution</a></li><li><a onclick="navigate('market')" class="hover:text-blue-400 cursor-pointer">Secondary Market</a></li></ul></div>
        <div><h4 class="font-bold text-white mb-3">Legal</h4><ul class="space-y-2 text-sm"><li>Zero Custody Architecture</li><li>Licensed Law-Firm Escrow</li><li>FRA Regulatory Compliance</li></ul></div>
        <div><h4 class="font-bold text-white mb-3">JOZOUR Fees</h4><ul class="space-y-2 text-sm"><li><i class="fas fa-percentage text-emerald-400 mr-1"></i>2.5% Cash Commission</li><li><i class="fas fa-chart-pie text-purple-400 mr-1"></i>2.5% Equity (A/B/C)</li><li><i class="fas fa-user-shield text-amber-400 mr-1"></i>5yr Board + Veto</li><li><i class="fas fa-vote-yea text-blue-400 mr-1"></i>Shareholder Vote at 5yr</li></ul></div>
      </div>
      <div class="border-t border-slate-800 pt-6 text-center text-xs"><p>2026 SHERKETI Platform. Constitutional rules publicly auditable.</p></div>
    </div>
  </footer>`;
}

// ============ Auth ============
function renderAuth(mode) {
  const isLogin = mode === 'login';
  return `${renderNav()}
  <div class="min-h-screen flex items-center justify-center pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
    <div class="w-full max-w-md fade-in">
      <div class="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25"><i class="fas fa-shield-halved text-white text-2xl"></i></div>
          <h2 class="text-2xl font-bold text-slate-800">${isLogin ? 'Welcome Back' : 'Join SHERKETI'}</h2>
          <p class="text-slate-500 text-sm mt-1">${isLogin ? 'Sign in to your account' : 'Create your investment account'}</p>
        </div>
        <form id="authForm" class="space-y-4">
          ${!isLogin ? `
            <div><label class="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" name="full_name" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Enter your full name"></div>
            <div><label class="block text-sm font-medium text-slate-700 mb-1">Full Name (Arabic)</label><input type="text" name="full_name_ar" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm ar-text" placeholder="الاسم بالعربي" dir="rtl"></div>
          ` : ''}
          <div><label class="block text-sm font-medium text-slate-700 mb-1">Email *</label><input type="email" name="email" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="you@example.com"></div>
          <div><label class="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="password" name="password" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Min 6 characters" minlength="6"></div>
          ${!isLogin ? `
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm font-medium text-slate-700 mb-1">User Type</label><select name="user_type" class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"><option value="egyptian_individual">Egyptian Individual</option><option value="foreigner_in_egypt">Foreigner in Egypt</option><option value="foreigner_outside">Foreigner Outside</option><option value="egyptian_company">Egyptian Company</option><option value="foreign_company">Foreign Company</option></select></div>
              <div><label class="block text-sm font-medium text-slate-700 mb-1">I want to</label><select name="role" class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"><option value="investor">Invest</option><option value="founder">Raise Capital</option></select></div>
            </div>
            <div><label class="block text-sm font-medium text-slate-700 mb-1">National ID / Passport</label><input type="text" name="national_id" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Government-issued ID"></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="tel" name="phone" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="+20 1xx xxx xxxx"></div>
              <div><label class="block text-sm font-medium text-slate-700 mb-1">Region</label><select name="region" class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"><option value="cairo">Cairo</option><option value="alexandria">Alexandria</option><option value="delta">Delta</option><option value="upper_egypt">Upper Egypt</option></select></div>
            </div>
          ` : ''}
          <div id="authError" class="text-red-600 text-sm hidden p-3 bg-red-50 rounded-lg"></div>
          <button type="submit" class="btn-primary w-full py-3 text-base"><i class="fas ${isLogin?'fa-sign-in-alt':'fa-user-plus'} mr-2"></i>${isLogin ? 'Sign In' : 'Create Account'}</button>
        </form>
        <p class="text-center text-sm text-slate-500 mt-6">${isLogin?"Don't have an account?":'Already have an account?'} <a onclick="navigate('${isLogin?'register':'login'}')" class="text-blue-600 font-semibold cursor-pointer hover:underline ml-1">${isLogin?'Sign Up':'Log In'}</a></p>
        ${isLogin ? `<div class="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700"><strong>Demo Accounts:</strong><br>Admin/JOZOUR: admin@sherketi.com | Founder: ahmed@techstartup.com<br>Investor: sara@gmail.com | Manager: manager@sherketi.com<br>Accountant: accountant@audit.com | Law Firm: lawfirm@elmasry-law.com<br><em>Password for all: admin123</em></div>` : ''}
      </div>
    </div>
  </div>`;
}

// ============ Dashboard (role-adaptive) ============
function renderDashboard() {
  const role = currentUser?.role || 'investor';
  return `${renderNav()}
  <div class="pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto fade-in">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">${roleLabel(role)} Dashboard</h1>
        <p class="text-slate-500 text-sm">${currentUser?.verification_status === 'verified' ? '<i class="fas fa-check-circle text-emerald-500"></i> KYC Verified' : '<i class="fas fa-clock text-amber-500"></i> Pending Verification'} · ${currentUser?.full_name}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${['founder','admin'].includes(role) ? `<button onclick="navigate('create-project')" class="btn-primary text-sm"><i class="fas fa-plus mr-1"></i>New Project</button>` : ''}
        <button onclick="loadDashboardData()" class="btn-secondary text-sm"><i class="fas fa-sync mr-1"></i>Refresh</button>
      </div>
    </div>
    ${currentUser?.verification_status !== 'verified' ? `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <i class="fas fa-exclamation-triangle text-amber-500 text-xl"></i>
        <div class="flex-1"><div class="font-semibold text-amber-800">KYC Verification Required</div><div class="text-sm text-amber-600">Complete identity verification to invest or create projects.</div></div>
        <button onclick="autoApproveKYC()" class="btn-primary text-xs py-2">Auto-Verify (Demo)</button>
      </div>` : ''}
    <div id="dashboardContent"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-3"></i></div></div>
  </div>`;
}

async function loadDashboardData() {
  const c = document.getElementById('dashboardContent');
  if (!c) return;
  try {
    const role = currentUser?.role;
    let ep = '/api/dashboard/investor';
    if (role === 'founder') ep = '/api/dashboard/founder';
    else if (role === 'admin') ep = '/api/admin/overview';
    else if (role === 'law_firm') ep = '/api/dashboard/law-firm';
    else if (role === 'manager') ep = '/api/dashboard/manager';
    else if (role === 'regulator') ep = '/api/dashboard/regulator';
    const data = await api(ep);
    if (role === 'admin') c.innerHTML = renderAdminDash(data);
    else if (role === 'founder') c.innerHTML = renderFounderDash(data);
    else if (role === 'law_firm') c.innerHTML = renderLawFirmDash(data);
    else if (role === 'manager') c.innerHTML = renderManagerDash(data);
    else if (role === 'regulator') c.innerHTML = renderRegulatorDash(data);
    else c.innerHTML = renderInvestorDash(data);
  } catch (e) { c.innerHTML = `<div class="text-center py-10 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>${e.message}</div>`; }
}

function renderInvestorDash(d) {
  const s = d.summary || {};
  return `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">${[{l:'Total Invested',v:formatEGP(s.total_invested),i:'fa-coins',c:'blue'},{l:'Current Value',v:formatEGP(s.current_value),i:'fa-chart-line',c:'emerald'},{l:'ROI',v:s.roi||'0%',i:'fa-arrow-trend-up',c:'purple'},{l:'Projects',v:s.projects_count||0,i:'fa-folder',c:'amber'}].map(x=>`
      <div class="bg-white rounded-xl p-4 border border-slate-200 card-hover"><div class="flex items-center gap-2 mb-2"><div class="w-8 h-8 rounded-lg bg-${x.c}-100 flex items-center justify-center"><i class="fas ${x.i} text-${x.c}-600 text-sm"></i></div><span class="text-xs text-slate-500">${x.l}</span></div><div class="text-lg font-bold text-slate-800">${x.v}</div></div>`).join('')}</div>
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2"><div class="bg-white rounded-xl border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100"><h3 class="font-bold text-slate-800"><i class="fas fa-briefcase mr-2 text-blue-500"></i>My Portfolio</h3></div><div class="divide-y divide-slate-100">${(d.portfolio||[]).length===0?'<div class="p-8 text-center text-slate-400"><i class="fas fa-folder-open text-3xl mb-2"></i><p>No investments. <a onclick="navigate(\'projects\')" class="text-blue-500 cursor-pointer">Explore projects</a></p></div>':''}${(d.portfolio||[]).map(p=>`<div class="p-4 hover:bg-slate-50 cursor-pointer transition-colors" onclick="navigate('project-detail',{id:${p.project_id}})"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl tier-badge-${p.tier} flex items-center justify-center text-white font-bold">${p.tier}</div><div><div class="font-semibold text-slate-800">${p.title}</div><div class="text-xs text-slate-500"><i class="fas ${statusIcon(p.project_status)} mr-1"></i>${(p.project_status||'').replace(/_/g,' ')} · ${p.sector||''}</div></div></div><div class="text-right"><div class="font-bold text-slate-800">${formatPercent(p.equity_percentage)}</div><div class="text-xs text-slate-500">${formatEGP(p.investment_amount)}</div></div></div></div>`).join('')}</div></div></div>
      <div class="space-y-6">
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100"><h3 class="font-bold text-slate-800"><i class="fas fa-bell mr-2 text-amber-500"></i>Pending Votes (${(d.pending_votes||[]).length})</h3></div><div class="divide-y divide-slate-100 max-h-60 overflow-y-auto">${(d.pending_votes||[]).length===0?'<div class="p-4 text-center text-slate-400 text-sm">No pending votes</div>':''}${(d.pending_votes||[]).map(v=>`<div class="p-3 hover:bg-slate-50"><div class="font-medium text-sm text-slate-800">${v.title}</div><div class="text-xs text-slate-500 mt-1">${v.project_title||''} · <i class="fas fa-clock mr-1"></i>${formatDate(v.voting_deadline)}</div><div class="flex gap-2 mt-2"><button onclick="castVote(${v.id},'for')" class="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 font-medium">Vote For</button><button onclick="castVote(${v.id},'against')" class="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 font-medium">Against</button></div></div>`).join('')}</div></div>
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden"><div class="p-4 border-b border-slate-100"><h3 class="font-bold text-slate-800"><i class="fas fa-shopping-cart mr-2 text-purple-500"></i>Market Opportunities</h3></div><div class="divide-y divide-slate-100 max-h-60 overflow-y-auto">${(d.market_opportunities||[]).length===0?'<div class="p-4 text-center text-slate-400 text-sm">No active listings</div>':''}${(d.market_opportunities||[]).map(o=>`<div class="p-3 hover:bg-slate-50 cursor-pointer" onclick="navigate('market')"><div class="font-medium text-sm text-slate-800">${o.title}</div><div class="text-xs text-slate-500">${o.shares_count} shares @ ${formatEGP(o.ask_price)}/share</div></div>`).join('')}</div></div>
      </div>
    </div>`;
}

function renderFounderDash(d) {
  return `
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-xl border border-slate-200"><div class="p-4 border-b border-slate-100"><h3 class="font-bold text-slate-800"><i class="fas fa-rocket mr-2 text-blue-500"></i>My Projects</h3></div>
          ${(d.projects||[]).length===0?'<div class="p-8 text-center text-slate-400"><i class="fas fa-plus-circle text-3xl mb-2"></i><p><a onclick="navigate(\'create-project\')" class="text-blue-500 cursor-pointer">Create your first project</a></p></div>':''}
          ${(d.projects||[]).map(p=>`<div class="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="navigate('project-detail',{id:${p.id}})">
            <div class="flex items-center justify-between mb-3"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-xl tier-badge-${p.tier} flex items-center justify-center text-white font-bold text-lg">${p.tier}</div><div><div class="font-bold text-slate-800">${p.title}</div><div class="text-xs text-slate-500">${p.sector} · <i class="fas ${statusIcon(p.status)}"></i> ${(p.status||'').replace(/_/g,' ')}</div></div></div>
              <div class="text-right text-sm"><div class="font-bold">${formatEGP(p.funding_raised)} <span class="text-slate-400">/ ${formatEGP(p.funding_goal)}</span></div>
              <div class="text-xs"><span class="text-emerald-600">Comm: ${p.jozour_commission_percent}%</span> <span class="text-purple-600 ml-1">Eq: ${p.jozour_equity_percent}%</span> ${p.jozour_veto_active?'<span class="text-amber-600 ml-1">Veto</span>':''}</div></div></div>
            <div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full progress-bar" style="width:${Math.min(100,(p.funding_raised/p.funding_goal*100))}%"></div></div>
            <div class="flex justify-between mt-2 text-xs text-slate-500"><span>${Math.round(p.funding_raised/p.funding_goal*100)}% funded</span><span>${p.investor_count||0} investors</span><span>AI: ${p.ai_feasibility_score||'-'}/100</span></div>
          </div>`).join('')}</div>
        <div class="bg-white rounded-xl border border-slate-200"><div class="p-4 border-b border-slate-100"><h3 class="font-bold text-slate-800"><i class="fas fa-flag-checkered mr-2 text-emerald-500"></i>Milestones</h3></div><div class="p-4 space-y-3">${(d.milestones||[]).map(m=>`<div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full ${m.status==='completed'?'bg-emerald-100 text-emerald-600':m.status==='in_progress'?'bg-blue-100 text-blue-600':'bg-slate-100 text-slate-400'} flex items-center justify-center"><i class="fas ${m.status==='completed'?'fa-check':m.status==='in_progress'?'fa-spinner fa-spin':'fa-clock'} text-sm"></i></div><div class="flex-1"><div class="text-sm font-medium text-slate-800">${m.title}</div><div class="text-xs text-slate-500">${m.project_title||''} · ${formatEGP(m.tranche_amount)}</div></div><span class="text-xs px-2 py-1 rounded-full ${m.status==='completed'?'bg-emerald-100 text-emerald-700':m.status==='in_progress'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500'}">${(m.status||'').replace(/_/g,' ')}</span></div>`).join('')}</div></div>
      </div>
      <div class="space-y-6">
        <div class="bg-white rounded-xl border border-slate-200 p-4"><h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-vault mr-2 text-emerald-500"></i>Escrow Overview</h3>${(d.escrow_overview||[]).map(e=>`<div class="mb-3 p-3 bg-slate-50 rounded-lg"><div class="text-sm font-medium text-slate-800">${e.title} <span class="text-xs px-2 py-0.5 tier-badge-${e.tier} text-white rounded ml-1">Tier ${e.tier}</span></div><div class="grid grid-cols-2 gap-2 mt-2 text-xs"><div><span class="text-slate-500">Deposited</span><br><span class="font-bold text-emerald-600">${formatEGP(e.total_deposits)}</span></div><div><span class="text-slate-500">Released</span><br><span class="font-bold text-blue-600">${formatEGP(e.total_released)}</span></div></div><div class="text-xs mt-1 text-purple-600"><i class="fas fa-hand-holding-dollar mr-1"></i>JOZOUR Commission: ${formatEGP(e.jozour_commission_paid)}</div></div>`).join('')}</div>
        <div class="bg-white rounded-xl border border-slate-200 p-4"><h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-user-tie mr-2 text-amber-500"></i>Board Members</h3><div class="space-y-2">${(d.board_members||[]).map(b=>`<div class="flex items-center gap-2 p-2 rounded-lg ${b.role==='jozour_observer'?'bg-amber-50 border border-amber-200':'hover:bg-slate-50'}"><div class="w-7 h-7 rounded-full ${b.role==='jozour_observer'?'bg-amber-500':'bg-blue-500'} flex items-center justify-center text-white text-xs"><i class="fas ${b.role==='jozour_observer'?'fa-shield':'fa-user'}"></i></div><div class="flex-1"><div class="text-sm font-medium">${b.full_name}</div><div class="text-xs text-slate-500">${boardRoleLabel(b.role)} · ${b.project_title||''}</div></div>${b.has_veto?'<span class="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Veto</span>':''}</div>`).join('')}</div></div>
        <div class="bg-white rounded-xl border border-slate-200 p-4"><h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-gavel mr-2 text-red-500"></i>Open Votes</h3>${(d.pending_votes||[]).length===0?'<p class="text-sm text-slate-400 text-center">No open votes</p>':''}${(d.pending_votes||[]).map(v=>`<div class="p-2 bg-blue-50 rounded-lg mb-2"><div class="text-sm font-medium">${v.title}</div><div class="text-xs text-slate-500">${v.project_title} · ${formatDate(v.voting_deadline)}</div></div>`).join('')}</div>
      </div>
    </div>`;
}

function renderManagerDash(d) {
  return `<div class="grid lg:grid-cols-2 gap-6">
    <div class="bg-white rounded-xl border border-slate-200"><div class="p-4 border-b border-slate-100"><h3 class="font-bold"><i class="fas fa-briefcase mr-2 text-blue-500"></i>Managed Projects</h3></div>${(d.managed_projects||[]).map(p=>`<div class="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="navigate('project-detail',{id:${p.id}})"><div class="flex items-center justify-between"><div><div class="font-bold">${p.title}</div><div class="text-xs text-slate-500">${(p.status||'').replace(/_/g,' ')} · ${p.investor_count||0} investors</div></div><div class="text-right"><div class="font-bold">${formatEGP(p.funding_raised)}</div>${p.active_alerts>0?`<span class="text-xs text-red-500"><i class="fas fa-exclamation-triangle"></i> ${p.active_alerts}</span>`:''}</div></div></div>`).join('')}</div>
    <div class="space-y-6">
      <div class="bg-white rounded-xl border border-slate-200"><div class="p-4 border-b border-slate-100"><h3 class="font-bold"><i class="fas fa-clock mr-2 text-amber-500"></i>Pending Transactions</h3></div>${(d.pending_transactions||[]).length===0?'<div class="p-4 text-sm text-slate-400 text-center">No pending transactions</div>':''}${(d.pending_transactions||[]).map(t=>`<div class="p-3 border-b border-slate-100"><div class="flex justify-between"><span class="font-medium text-sm">${t.title}</span><span class="font-bold text-sm">${formatEGP(t.amount)}</span></div><div class="text-xs text-slate-500 capitalize mt-1">${t.transaction_type} · ${t.status}</div></div>`).join('')}</div>
      <div class="bg-white rounded-xl border border-slate-200"><div class="p-4 border-b border-slate-100"><h3 class="font-bold"><i class="fas fa-money-bill mr-2 text-emerald-500"></i>Salary Records</h3></div>${(d.salary_records||[]).map(s=>`<div class="p-3 border-b border-slate-100"><div class="flex justify-between"><div><span class="font-medium text-sm">${s.full_name}</span><br><span class="text-xs text-slate-500">${s.project_title} · ${s.period}</span></div><span class="font-bold">${formatEGP(s.calculated_salary)}</span></div></div>`).join('')}</div>
    </div>
  </div>`;
}

function renderLawFirmDash(d) {
  return `<div class="grid lg:grid-cols-2 gap-6">
    <div class="space-y-6">
      <div class="bg-white rounded-xl border border-slate-200"><div class="p-4 border-b border-slate-100"><h3 class="font-bold"><i class="fas fa-building-columns mr-2 text-blue-500"></i>Assigned Projects (${(d.assigned_projects||[]).length})</h3></div>${(d.assigned_projects||[]).map(p=>`<div class="p-4 border-b border-slate-100"><div class="flex justify-between"><div><div class="font-bold">${p.title}</div><div class="text-xs text-slate-500">Founder: ${p.founder_name} · ${(p.status||'').replace(/_/g,' ')}</div></div><div class="text-right text-sm font-bold">${formatEGP(p.total_escrow_volume||0)}</div></div></div>`).join('')}</div>
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4"><h3 class="font-bold text-amber-800 mb-2"><i class="fas fa-stamp mr-2"></i>Pending Notarizations (${(d.pending_notarizations||[]).length})</h3>${(d.pending_notarizations||[]).map(n=>`<div class="p-2 bg-white rounded-lg mb-2"><div class="font-medium text-sm">${n.title}</div><div class="text-xs text-slate-500">${n.title} · Vote passed</div><button onclick="showToast('Notarization simulated','success')" class="text-xs btn-primary mt-1 py-1">Notarize</button></div>`).join('')}${(d.pending_notarizations||[]).length===0?'<p class="text-sm text-amber-600">No pending notarizations</p>':''}</div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200"><div class="p-4 border-b border-slate-100"><h3 class="font-bold"><i class="fas fa-money-bill-transfer mr-2 text-emerald-500"></i>Escrow Transactions</h3></div><div class="max-h-[500px] overflow-y-auto">${(d.escrow_transactions||[]).map(t=>`<div class="p-3 border-b border-slate-100"><div class="flex justify-between"><div><span class="font-medium text-sm capitalize">${t.transaction_type}</span> · <span class="text-slate-500 text-sm">${t.title}</span></div><span class="font-bold text-sm ${t.transaction_type==='deposit'?'text-emerald-600':'text-blue-600'}">${t.transaction_type==='deposit'?'+':''}${formatEGP(t.amount)}</span></div><div class="text-xs text-slate-400 mt-1">${t.status} · ${t.law_firm_stamp||''}</div></div>`).join('')}</div></div>
  </div>`;
}

function renderRegulatorDash(d) {
  return `<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"><div class="flex items-center gap-2"><i class="fas fa-eye text-amber-500"></i><span class="font-bold text-amber-800">FRA Regulatory Shadow Mode</span></div><p class="text-sm text-amber-600 mt-1">${d.disclaimer}</p></div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-building mr-2 text-blue-500"></i>Projects</h3>${(d.project_statistics||[]).map(p=>`<div class="flex justify-between text-sm py-1"><span>Tier ${p.tier} · ${(p.status||'').replace(/_/g,' ')}</span><span class="font-bold">${p.count} (${formatEGP(p.total_raised||0)})</span></div>`).join('')}</div>
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-vault mr-2 text-emerald-500"></i>Escrow</h3>${(d.escrow_balance||[]).map(e=>`<div class="flex justify-between text-sm py-1"><span class="capitalize">${e.transaction_type}</span><span class="font-bold">${formatEGP(e.total)}</span></div>`).join('')}</div>
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-hand-holding-dollar mr-2 text-purple-500"></i>JOZOUR Fees</h3>${(d.jozour_overview||[]).map(j=>`<div class="flex justify-between text-sm py-1"><span>Tier ${j.tier} (${j.projects} projects)</span><span class="font-bold">${formatEGP(j.total_commission||0)}</span></div>`).join('')}</div>
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-gavel mr-2 text-amber-500"></i>Governance</h3>${(d.governance_events||[]).map(e=>`<div class="flex justify-between text-sm py-1"><span>${(e.event_type||'').replace(/_/g,' ')}</span><span class="font-bold">${e.count}</span></div>`).join('')}</div>
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>Risk Alerts</h3>${(d.active_risks||[]).length===0?'<p class="text-sm text-slate-400">No active risks</p>':''}${(d.active_risks||[]).map(r=>`<div class="flex justify-between text-sm py-1"><span class="${r.alert_level==='red'?'text-red-600':'text-amber-600'}">${r.alert_level.toUpperCase()} · ${r.risk_category}</span><span class="font-bold">${r.count}</span></div>`).join('')}</div>
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-balance-scale mr-2 text-purple-500"></i>Disputes</h3>${(d.dispute_summary||[]).length===0?'<p class="text-sm text-slate-400">No disputes</p>':''}${(d.dispute_summary||[]).map(ds=>`<div class="flex justify-between text-sm py-1"><span class="capitalize">${(ds.status||'').replace(/_/g,' ')}</span><span class="font-bold">${ds.count}</span></div>`).join('')}</div>
    </div>`;
}

function renderAdminDash(d) {
  return `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">${[{l:'Users',v:(d.users||[]).reduce((s,u)=>s+u.count,0),i:'fa-users',c:'blue'},{l:'Projects',v:(d.projects||[]).reduce((s,p)=>s+p.count,0),i:'fa-rocket',c:'purple'},{l:'Escrow Volume',v:formatEGP((d.escrow||[]).reduce((s,e)=>s+e.total,0)),i:'fa-vault',c:'emerald'},{l:'Active Alerts',v:(d.active_alerts||[]).reduce((s,a)=>s+a.count,0),i:'fa-exclamation-triangle',c:'red'}].map(x=>`<div class="bg-white rounded-xl p-4 border card-hover"><div class="w-8 h-8 rounded-lg bg-${x.c}-100 flex items-center justify-center mb-2"><i class="fas ${x.i} text-${x.c}-600"></i></div><div class="text-lg font-bold">${x.v}</div><div class="text-xs text-slate-500">${x.l}</div></div>`).join('')}</div>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3">Users by Role</h3>${(d.users||[]).map(u=>`<div class="flex justify-between text-sm py-1"><span class="capitalize">${u.role} (${u.verification_status})</span><span class="font-bold">${u.count}</span></div>`).join('')}</div>
      <div class="bg-white rounded-xl border p-4"><h3 class="font-bold mb-3">Projects by Tier</h3>${(d.projects||[]).map(p=>`<div class="flex justify-between text-sm py-1"><span>Tier ${p.tier} · ${(p.status||'').replace(/_/g,' ')}</span><span class="font-bold">${p.count} (${formatEGP(p.total_raised||0)})</span></div>`).join('')}</div>
    </div>`;
}

// ============ Projects List / Detail / Create / Constitution / Market / AI / Admin / Notifications ============
// (These sections remain similar to v1 with JOZOUR fee updates throughout)

function renderProjectsList() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto fade-in">
    <div class="flex items-center justify-between mb-6"><div><h1 class="text-2xl font-bold text-slate-800"><i class="fas fa-rocket mr-2 text-blue-500"></i>Explore Projects</h1><p class="text-slate-500 text-sm">AI-verified investment opportunities</p></div>
    ${currentUser?.role==='founder'||currentUser?.role==='admin'?`<button onclick="navigate('create-project')" class="btn-primary text-sm"><i class="fas fa-plus mr-1"></i>New Project</button>`:''}</div>
    <div class="flex flex-wrap gap-2 mb-6">${['All','live_fundraising','interest_phase','active','funded'].map((f,i)=>`<button onclick="filterProjects(${i===0?'':'\''+f+'\''})" class="px-4 py-2 ${i===0?'bg-blue-600 text-white':'bg-white border border-slate-200 hover:border-blue-500'} rounded-lg text-sm font-medium">${i===0?'All':(f||'').replace(/_/g,' ')}</button>`).join('')}</div>
    <div id="projectsGrid"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i></div></div></div>`;
}

async function filterProjects(status) {
  const c = document.getElementById('projectsGrid'); if (!c) return;
  try {
    const data = await api(`/api/projects${status?'?status='+status:''}`);
    const ps = data.projects || [];
    if (!ps.length) { c.innerHTML = '<div class="text-center py-16 text-slate-400"><i class="fas fa-search text-4xl mb-3"></i><p>No projects found</p></div>'; return; }
    c.innerHTML = `<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">${ps.map(p=>`<div class="card-hover bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer" onclick="navigate('project-detail',{id:${p.id}})">
      <div class="tier-badge-${p.tier} p-4 flex items-center justify-between"><div><span class="text-white/80 text-xs font-medium">TIER ${p.tier}</span><h3 class="text-lg font-bold text-white">${p.title}</h3></div><div class="text-right"><div class="text-white font-bold text-lg">${p.ai_feasibility_score||'--'}</div><div class="text-white/70 text-xs">AI Score</div></div></div>
      <div class="p-4"><p class="text-sm text-slate-600 line-clamp-2 mb-3">${(p.description||'').substring(0,120)}...</p>
        <div class="flex flex-wrap gap-2 mb-3"><span class="px-2 py-1 bg-slate-100 rounded-full text-xs">${p.sector}</span><span class="px-2 py-1 bg-slate-100 rounded-full text-xs"><i class="fas ${statusIcon(p.status)} mr-1"></i>${(p.status||'').replace(/_/g,' ')}</span></div>
        <div class="mb-3"><div class="flex justify-between text-xs mb-1"><span class="text-slate-500">${formatEGP(p.funding_raised)}</span><span class="font-bold">${Math.round((p.funding_raised||0)/(p.funding_goal||1)*100)}%</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full progress-bar" style="width:${Math.min(100,(p.funding_raised||0)/(p.funding_goal||1)*100)}%"></div></div><div class="text-xs text-slate-400 mt-1">Goal: ${formatEGP(p.funding_goal)}</div></div>
        <div class="flex items-center justify-between text-xs text-slate-500"><span><i class="fas fa-user mr-1"></i>${p.founder_name||''}</span><span>Min ${formatEGP(p.min_investment)}</span></div>
      </div></div>`).join('')}</div>`;
  } catch (e) { c.innerHTML = `<div class="text-center py-10 text-red-500">${e.message}</div>`; }
}

function renderProjectDetail() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto fade-in"><div id="projectDetailContent"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i></div></div></div>`;
}

async function loadProjectDetail() {
  const c = document.getElementById('projectDetailContent'); if (!c) return;
  const params = getState('params'); if (!params?.id) { c.innerHTML = '<p class="text-center py-10 text-red-500">No project ID</p>'; return; }
  try {
    const data = await api(`/api/projects/${params.id}`);
    const p = data.project;
    const prog = Math.min(100, (p.funding_raised||0)/(p.funding_goal||1)*100);
    c.innerHTML = `
      <button onclick="navigate('projects')" class="text-sm text-slate-500 hover:text-blue-600 mb-4 inline-block"><i class="fas fa-arrow-left mr-1"></i>Back</button>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-2xl border overflow-hidden"><div class="tier-badge-${p.tier} p-6"><div class="flex items-center justify-between"><div><div class="flex items-center gap-2 mb-2"><span class="px-3 py-1 bg-white/20 rounded-full text-white text-sm">Tier ${p.tier}</span><span class="px-3 py-1 bg-white/20 rounded-full text-white text-sm"><i class="fas ${statusIcon(p.status)} mr-1"></i>${(p.status||'').replace(/_/g,' ')}</span></div><h1 class="text-3xl font-bold text-white">${p.title}</h1>${p.title_ar?`<p class="ar-text text-white/80 font-cairo">${p.title_ar}</p>`:''}</div><div class="text-right"><div class="text-4xl font-black text-white">${p.ai_feasibility_score||'--'}</div><div class="text-white/70 text-sm">AI Score</div></div></div></div>
            <div class="p-6"><p class="text-slate-600 leading-relaxed mb-4">${p.description}</p>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">${[{l:'Sector',v:p.sector},{l:'Founder',v:p.founder_name},{l:'Region',v:p.company_region},{l:'Health',v:(p.health_score||0)+'/100'}].map(x=>`<div class="p-3 bg-slate-50 rounded-lg"><span class="text-slate-500 text-xs block">${x.l}</span><span class="font-bold capitalize">${x.v}</span></div>`).join('')}</div></div></div>
          <!-- JOZOUR Fee Info -->
          <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-5">
            <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-hand-holding-dollar mr-2 text-purple-500"></i>JOZOUR Fee Structure (Tier ${p.tier})</h3>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div><div class="text-2xl font-black text-emerald-600">${p.jozour_commission_percent||2.5}%</div><div class="text-xs text-slate-500">Cash Commission</div><div class="text-xs text-slate-400">${formatEGP((p.funding_goal||0)*((p.jozour_commission_percent||2.5)/100))}</div></div>
              <div><div class="text-2xl font-black text-purple-600">${p.jozour_equity_percent||0}%</div><div class="text-xs text-slate-500">Equity Stake</div></div>
              <div><div class="text-2xl font-black text-amber-600">${p.jozour_veto_active?'Active':'None'}</div><div class="text-xs text-slate-500">Veto Power</div>${p.jozour_board_term_end?`<div class="text-xs text-slate-400">Until ${formatDate(p.jozour_board_term_end)}</div>`:''}</div>
            </div>
          </div>
          <!-- Funding -->
          <div class="bg-white rounded-2xl border p-6"><h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-chart-pie mr-2 text-blue-500"></i>Funding Progress</h3>
            <div class="flex justify-between mb-2"><span class="text-2xl font-bold">${formatEGP(p.funding_raised)}</span><span class="text-slate-500">of ${formatEGP(p.funding_goal)}</span></div>
            <div class="w-full bg-slate-200 rounded-full h-4 mb-4"><div class="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full progress-bar flex items-center justify-end pr-2" style="width:${prog}%">${prog>15?`<span class="text-white text-xs font-bold">${Math.round(prog)}%</span>`:''}</div></div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"><div><span class="text-slate-500">Pre-Money</span><br><span class="font-bold">${formatEGP(p.pre_money_valuation)}</span></div><div><span class="text-slate-500">Post-Money</span><br><span class="font-bold">${formatEGP(p.post_money_valuation)}</span></div><div><span class="text-slate-500">Min. Investment</span><br><span class="font-bold">${formatEGP(p.min_investment)}</span></div><div><span class="text-slate-500">Equity Offered</span><br><span class="font-bold">${p.equity_offered}%</span></div></div>
            ${p.status==='live_fundraising'&&currentUser?`<div class="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200"><h4 class="font-bold text-blue-800 mb-2"><i class="fas fa-hand-holding-dollar mr-1"></i>Invest Now</h4><div class="flex gap-3"><input type="number" id="investAmount" min="${p.min_investment}" placeholder="Amount (EGP)" class="flex-1 px-4 py-2 border border-blue-300 rounded-lg"><button onclick="investInProject(${p.id})" class="btn-primary">Invest</button></div><p class="text-xs text-blue-600 mt-2"><i class="fas fa-shield mr-1"></i>Funds go to law-firm escrow. SHERKETI never touches your money.</p></div>`:''}
            ${p.status==='interest_phase'&&currentUser?`<div class="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200"><h4 class="font-bold text-amber-800 mb-2"><i class="fas fa-eye mr-1"></i>Interest Phase (${p.interest_votes} votes, ${formatEGP(p.soft_pledges)} pledged)</h4><div class="flex gap-3"><input type="number" id="pledgeAmount" placeholder="Soft pledge (EGP)" class="flex-1 px-4 py-2 border border-amber-300 rounded-lg"><button onclick="expressInterest(${p.id})" class="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600">Express Interest</button></div></div>`:''}
          </div>
          <!-- Milestones -->
          <div class="bg-white rounded-2xl border p-6"><h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-flag-checkered mr-2 text-emerald-500"></i>Milestones</h3><div class="space-y-4">${(data.milestones||[]).map((m,i)=>`<div class="flex items-start gap-4"><div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full ${m.status==='completed'?'bg-emerald-500':m.status==='in_progress'?'bg-blue-500 pulse-glow':'bg-slate-300'} flex items-center justify-center text-white font-bold">${i+1}</div>${i<(data.milestones||[]).length-1?'<div class="w-0.5 h-8 bg-slate-300 mt-1"></div>':''}</div><div class="flex-1 pb-4"><div class="flex items-center justify-between"><div class="font-bold text-slate-800">${m.title}</div><span class="text-xs px-2 py-1 rounded-full ${m.status==='completed'?'bg-emerald-100 text-emerald-700':m.status==='in_progress'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500'}">${(m.status||'').replace(/_/g,' ')}</span></div><div class="text-sm text-slate-700 mt-1">Tranche: ${formatEGP(m.tranche_amount)} (${m.tranche_percentage}%)</div></div></div>`).join('')}</div></div>
          <!-- Governance -->
          <div class="bg-white rounded-2xl border p-6"><h3 class="font-bold text-slate-800 mb-4"><i class="fas fa-list-check mr-2 text-purple-500"></i>Governance Timeline</h3><div class="space-y-3 max-h-80 overflow-y-auto">${(data.governance_events||[]).map(e=>`<div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"><div class="w-8 h-8 rounded-full ${e.event_type?.includes('jozour')?'bg-amber-100':'bg-purple-100'} flex items-center justify-center flex-shrink-0"><i class="fas ${e.event_type?.includes('jozour')?'fa-shield text-amber-500':'fa-scroll text-purple-500'} text-sm"></i></div><div><div class="text-sm font-medium text-slate-800">${(e.event_type||'').replace(/_/g,' ')}</div><div class="text-xs text-slate-500">${e.actor_name||'AI System'} · ${timeAgo(e.created_at)}</div>${e.ai_model?`<div class="text-xs text-purple-500 mt-1"><i class="fas fa-robot mr-1"></i>${e.ai_model}</div>`:''}</div></div>`).join('')}</div></div>
        </div>
        <!-- Sidebar -->
        <div class="space-y-6">
          <div class="bg-white rounded-2xl border p-4"><h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-users mr-2 text-blue-500"></i>Cap Table</h3><div class="space-y-2">${(data.shareholders||[]).map(s=>`<div class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"><div class="flex items-center gap-2"><div class="w-7 h-7 rounded-full ${s.acquired_via==='platform_fee'?'bg-gradient-to-br from-amber-400 to-purple-400':'bg-gradient-to-br from-blue-400 to-purple-400'} flex items-center justify-center text-white text-xs font-bold">${s.acquired_via==='platform_fee'?'J':(s.full_name||'?')[0]}</div><div class="text-sm"><div class="font-medium">${s.acquired_via==='platform_fee'?'JOZOUR':s.full_name}</div><div class="text-xs text-slate-400">${s.acquired_via==='platform_fee'?'Platform Equity':s.acquired_via}</div></div></div><div class="text-right"><div class="font-bold text-sm">${formatPercent(s.equity_percentage)}</div><div class="text-xs text-slate-400">${s.shares_count} shares</div></div></div>`).join('')}</div></div>
          <div class="bg-white rounded-2xl border p-4"><h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-user-tie mr-2 text-amber-500"></i>Board</h3><div class="space-y-2">${(data.board||[]).map(b=>`<div class="flex items-center gap-3 p-2 ${b.role==='jozour_observer'?'bg-amber-50 rounded-lg border border-amber-200':''}"><div class="w-8 h-8 rounded-full ${b.role==='jozour_observer'?'bg-amber-500':'bg-blue-500'} flex items-center justify-center text-white text-sm"><i class="fas ${b.role==='jozour_observer'?'fa-shield':'fa-user'}"></i></div><div class="flex-1"><div class="text-sm font-medium">${b.full_name}</div><div class="text-xs text-slate-500">${boardRoleLabel(b.role)}${b.has_veto?' · <span class="text-red-600 font-semibold">VETO</span>':''}${b.term_end?' · Until '+formatDate(b.term_end):''}</div></div></div>`).join('')}</div></div>
          <div class="bg-white rounded-2xl border p-4"><h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-gavel mr-2 text-red-500"></i>Active Votes</h3>${(data.active_votes||[]).length===0?'<p class="text-sm text-slate-400 text-center py-3">No active votes</p>':''}${(data.active_votes||[]).map(v=>`<div class="p-3 bg-blue-50 rounded-lg mb-2"><div class="text-sm font-medium">${v.title}</div><div class="text-xs text-slate-500 mt-1">${(v.vote_type||'').replace(/_/g,' ')} · ${formatDate(v.voting_deadline)}</div>${currentUser?`<div class="flex gap-2 mt-2"><button onclick="castVote(${v.id},'for')" class="text-xs px-3 py-1 bg-emerald-500 text-white rounded-full">Vote For</button><button onclick="castVote(${v.id},'against')" class="text-xs px-3 py-1 bg-red-500 text-white rounded-full">Against</button></div>`:''}</div>`).join('')}</div>
          ${(data.risk_alerts||[]).length>0?`<div class="bg-white rounded-2xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>Alerts</h3>${(data.risk_alerts||[]).map(a=>`<div class="p-3 ${a.alert_level==='red'?'bg-red-50 border-red-200':'bg-amber-50 border-amber-200'} rounded-lg mb-2 border"><div class="flex items-center gap-2"><span class="status-dot ${a.alert_level==='red'?'status-frozen':'status-pending'}"></span><span class="text-sm font-medium">${a.title}</span></div><p class="text-xs text-slate-600 mt-1">${a.description}</p></div>`).join('')}</div>`:''}
          <div class="bg-white rounded-2xl border p-4"><h3 class="font-bold mb-3"><i class="fas fa-vault mr-2 text-emerald-500"></i>Escrow</h3>${(data.escrow_summary||[]).map(e=>`<div class="flex justify-between py-2 border-b border-slate-100 last:border-0"><span class="text-sm capitalize">${e.transaction_type}</span><span class="font-bold text-sm">${formatEGP(e.total)}</span></div>`).join('')}</div>
        </div>
      </div>`;
  } catch (e) { c.innerHTML = `<div class="text-center py-10 text-red-500">${e.message}</div>`; }
}

function renderCreateProject() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-3xl mx-auto fade-in">
    <h1 class="text-2xl font-bold mb-2"><i class="fas fa-plus-circle mr-2 text-blue-500"></i>Create New Project</h1>
    <p class="text-slate-500 text-sm mb-6">Submit for AI feasibility review and fundraising</p>
    <form id="createProjectForm" class="bg-white rounded-2xl border p-6 space-y-5">
      <div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Title *</label><input type="text" name="title" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg" placeholder="e.g. NileTech Solutions"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Title (Arabic)</label><input type="text" name="title_ar" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg ar-text" dir="rtl"></div></div>
      <div><label class="block text-sm font-medium text-slate-700 mb-1">Description *</label><textarea name="description" required rows="4" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg" placeholder="Describe your business..."></textarea></div>
      <div class="grid md:grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium mb-1">Sector *</label><select name="sector" required class="w-full px-3 py-2.5 border rounded-lg">${['Technology','FinTech','Green Energy','Healthcare','Food & Beverage','Real Estate','Education','E-Commerce','Manufacturing','Agriculture','Logistics','Other'].map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium mb-1">Tier *</label><select name="tier" required class="w-full px-3 py-2.5 border rounded-lg" onchange="updateTierInfo(this.value)"><option value="A">Tier A (max 3M)</option><option value="B">Tier B (max 25M)</option><option value="C">Tier C (Unlimited)</option><option value="D">Tier D (Existing Co.)</option></select></div>
        <div><label class="block text-sm font-medium mb-1">Region</label><select name="company_region" class="w-full px-3 py-2.5 border rounded-lg"><option value="cairo">Cairo</option><option value="alexandria">Alexandria</option><option value="delta">Delta</option><option value="upper_egypt">Upper Egypt</option></select></div>
      </div>
      <div id="tierInfo" class="p-3 bg-purple-50 rounded-lg text-sm"><i class="fas fa-info-circle text-purple-500 mr-1"></i><strong>Tier A:</strong> JOZOUR takes 2.5% cash commission + 2.5% equity + 5yr board seat with veto.</div>
      <div class="grid md:grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium mb-1">Funding Goal (EGP) *</label><input type="number" name="funding_goal" required min="50000" class="w-full px-4 py-2.5 border rounded-lg" placeholder="5000000"></div>
        <div><label class="block text-sm font-medium mb-1">Equity Offered (%) *</label><input type="number" name="equity_offered" required min="1" max="49" step="0.1" class="w-full px-4 py-2.5 border rounded-lg" placeholder="25"></div>
        <div><label class="block text-sm font-medium mb-1">Min. Investment</label><input type="number" name="min_investment" min="50" value="50" class="w-full px-4 py-2.5 border rounded-lg"></div>
      </div>
      <div><label class="block text-sm font-medium mb-2">Milestones</label><div id="milestonesContainer" class="space-y-2"><div class="flex gap-2"><input type="text" placeholder="Milestone title" class="milestone-title flex-1 px-3 py-2 border rounded-lg text-sm"><input type="number" placeholder="Amount EGP" class="milestone-amount w-32 px-3 py-2 border rounded-lg text-sm"></div></div><button type="button" onclick="addMilestone()" class="mt-2 text-sm text-blue-600 hover:text-blue-700"><i class="fas fa-plus mr-1"></i>Add Milestone</button></div>
      <div id="createError" class="text-red-600 text-sm hidden p-3 bg-red-50 rounded-lg"></div>
      <div id="createSuccess" class="text-emerald-600 text-sm hidden p-3 bg-emerald-50 rounded-lg"></div>
      <button type="submit" class="btn-primary w-full py-3"><i class="fas fa-paper-plane mr-2"></i>Create & Submit for AI Review</button>
    </form></div>`;
}

function renderConstitution() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-5xl mx-auto fade-in">
    <div class="text-center mb-8"><h1 class="text-3xl font-bold"><i class="fas fa-scroll mr-2 text-amber-500"></i>SHERKETI Constitution</h1><p class="text-slate-500">Publicly auditable governance rules</p></div>
    <div id="constitutionContent"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i></div></div></div>`;
}

async function loadConstitution() {
  const c = document.getElementById('constitutionContent'); if (!c) return;
  try {
    const d = await api('/api/constitution/rules');
    c.innerHTML = `
      <div class="space-y-4 mb-8">${(d.immutable_core_rules||[]).map(r=>`<div class="bg-white rounded-xl border ${r.amendable?'border-amber-200':'border-red-200'} p-5 card-hover"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-xl ${r.amendable?'bg-amber-100 text-amber-600':'bg-red-100 text-red-600'} flex items-center justify-center font-bold flex-shrink-0">${r.id}</div><div class="flex-1"><div class="flex items-center gap-2 mb-1"><h3 class="font-bold text-slate-800">${r.title}</h3>${!r.amendable?'<span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium"><i class="fas fa-lock mr-1"></i>Non-Amendable</span>':'<span class="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full font-medium">75% Supermajority</span>'}</div><p class="ar-text text-sm text-slate-400 font-cairo mb-2">${r.title_ar||''}</p><p class="text-sm text-slate-600 mb-2">${r.description}</p><div class="text-xs text-slate-500 bg-slate-50 p-2 rounded"><i class="fas fa-shield mr-1"></i><strong>Enforcement:</strong> ${r.enforcement}</div></div></div></div>`).join('')}</div>
      <!-- JOZOUR Fee Model Section -->
      ${d.jozour_fee_model?`<div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-6 mb-8"><h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fas fa-hand-holding-dollar mr-2 text-purple-500"></i>JOZOUR Fee Model Details</h3>
        <div class="grid md:grid-cols-4 gap-4">${Object.entries(d.jozour_fee_model.tiers||{}).map(([k,v])=>`<div class="bg-white rounded-xl p-4 border"><div class="font-bold text-center mb-2"><span class="px-3 py-1 tier-badge-${k} text-white rounded-full text-sm">Tier ${k}</span></div><div class="space-y-1 text-sm"><div class="flex justify-between"><span class="text-slate-500">Commission</span><span class="font-bold text-emerald-600">${v.cash_commission}</span></div><div class="flex justify-between"><span class="text-slate-500">Equity</span><span class="font-bold text-purple-600">${v.equity_stake}</span></div><div class="flex justify-between"><span class="text-slate-500">Board</span><span class="font-bold ${v.board_seat?'text-amber-600':'text-slate-400'}">${v.board_seat?v.board_term:'None'}</span></div><div class="flex justify-between"><span class="text-slate-500">Veto</span><span class="font-bold ${v.veto_power?'text-red-600':'text-slate-400'}">${v.veto_power?'Yes':'No'}</span></div></div></div>`).join('')}</div>
        <p class="text-sm text-slate-600 mt-4"><i class="fas fa-info-circle mr-1"></i><strong>After 5 years:</strong> ${d.jozour_fee_model.after_5_years}</p></div>`:''}
      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl border p-5"><h3 class="font-bold mb-3"><i class="fas fa-gavel mr-2 text-blue-500"></i>Voting Rules</h3>${Object.entries(d.governance_rules?.voting||{}).map(([k,v])=>`<div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm"><span class="text-slate-500 capitalize">${k.replace(/_/g,' ')}</span><span class="font-medium text-slate-800 text-right max-w-[60%]">${v}</span></div>`).join('')}</div>
        <div class="bg-white rounded-xl border p-5"><h3 class="font-bold mb-3"><i class="fas fa-money-bill-transfer mr-2 text-emerald-500"></i>Transaction Approval</h3>${Object.entries(d.governance_rules?.transaction_approval||{}).map(([k,v])=>`<div class="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0 text-sm"><span class="text-slate-500 capitalize min-w-[100px]">${k.replace(/_/g,' ')}</span><span class="font-medium text-slate-800">${v}</span></div>`).join('')}</div>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border p-5"><h3 class="font-bold mb-3"><i class="fas fa-layer-group mr-2 text-purple-500"></i>Project Tiers</h3>${Object.entries(d.project_tiers||{}).map(([k,v])=>`<div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"><div><span class="px-2 py-0.5 tier-badge-${k} text-white text-xs rounded font-bold mr-2">Tier ${k}</span><span class="text-sm">${v.name}</span></div><span class="text-sm font-medium">${v.max_raise}</span></div>`).join('')}</div>
        <div class="bg-white rounded-xl border p-5"><h3 class="font-bold mb-3"><i class="fas fa-brain mr-2 text-purple-500"></i>AI Modules</h3><div class="space-y-2">${(d.ai_modules||[]).map(m=>`<div class="text-sm text-slate-600 flex items-center gap-2"><i class="fas fa-check-circle text-purple-400"></i>${m}</div>`).join('')}</div></div>
      </div>`;
  } catch (e) { c.innerHTML = `<div class="text-center py-10 text-red-500">${e.message}</div>`; }
}

function renderSecondaryMarket() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto fade-in">
    <div class="flex items-center justify-between mb-6"><div><h1 class="text-2xl font-bold"><i class="fas fa-chart-line mr-2 text-emerald-500"></i>Secondary Market</h1><p class="text-slate-500 text-sm">72h partner-first priority + AI dynamic valuation</p></div></div>
    <div id="marketContent"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i></div></div></div>`;
}

async function loadMarketData() {
  const c = document.getElementById('marketContent'); if (!c) return;
  try {
    const d = await api('/api/market/orders');
    c.innerHTML = `<div class="bg-white rounded-xl border overflow-hidden"><div class="p-4 border-b border-slate-100 flex items-center gap-4"><span class="font-bold">Active Listings</span><span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">${(d.orders||[]).length} orders</span></div>
      ${(d.orders||[]).length===0?'<div class="p-8 text-center text-slate-400"><i class="fas fa-store text-3xl mb-2"></i><p>No active listings</p></div>':''}
      <div class="divide-y divide-slate-100">${(d.orders||[]).map(o=>`<div class="p-4 hover:bg-slate-50"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white"><i class="fas fa-exchange-alt"></i></div><div><div class="font-bold">${o.project_title||'Project #'+o.project_id}</div><div class="text-xs text-slate-500">${o.shares_count} shares (${formatPercent(o.equity_percentage)}) · ${o.seller_name||'Seller'}</div></div></div><div class="text-right"><div class="font-bold text-lg">${formatEGP(o.ask_price)}<span class="text-xs text-slate-400">/share</span></div><div class="text-xs ${o.ai_valuation>o.ask_price?'text-emerald-500':'text-red-500'}">AI: ${formatEGP(o.ai_valuation)} ${o.ai_valuation>o.ask_price?'Underpriced':'Premium'}</div></div></div>
        <div class="flex items-center justify-between mt-3"><div><span class="px-2 py-1 text-xs rounded-full ${o.status==='priority_window'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}">${(o.status||'').replace(/_/g,' ')}</span>${o.priority_window_end?` <span class="text-xs text-slate-400 ml-2"><i class="fas fa-clock mr-1"></i>Priority: ${formatDate(o.priority_window_end)}</span>`:''}</div>${currentUser?`<button onclick="buyShares(${o.id})" class="btn-primary text-xs py-2">Buy Shares</button>`:'<span class="text-xs text-slate-400">Login to trade</span>'}</div></div>`).join('')}</div></div>`;
  } catch (e) { c.innerHTML = `<div class="text-center py-10 text-red-500">${e.message}</div>`; }
}

function renderAITools() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-5xl mx-auto fade-in">
    <h1 class="text-2xl font-bold mb-2"><i class="fas fa-brain mr-2 text-purple-500"></i>AI Engine Tools</h1><p class="text-slate-500 text-sm mb-6">AI-powered analysis and calculation engines</p>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl border p-6"><h3 class="font-bold mb-4"><i class="fas fa-calculator mr-2 text-blue-500"></i>JOZOUR Valuation v3.0</h3><form id="valuationForm" class="space-y-3"><input type="number" name="funding_goal" placeholder="Funding Goal (EGP)" class="w-full px-3 py-2 border rounded-lg text-sm" required><select name="sector" class="w-full px-3 py-2 border rounded-lg text-sm">${['Technology','FinTech','Green Energy','Healthcare','Food & Beverage','Education','E-Commerce'].map(s=>`<option>${s}</option>`).join('')}</select><select name="tier" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="A">Tier A</option><option value="B">Tier B</option><option value="C">Tier C</option><option value="D">Tier D</option></select><input type="number" name="feasibility_score" placeholder="Feasibility Score (0-100)" min="0" max="100" value="70" class="w-full px-3 py-2 border rounded-lg text-sm"><button type="submit" class="btn-primary w-full py-2 text-sm">Calculate</button></form><div id="valuationResult" class="mt-3"></div></div>
      <div class="bg-white rounded-2xl border p-6"><h3 class="font-bold mb-4"><i class="fas fa-coins mr-2 text-amber-500"></i>AI Salary Engine</h3><form id="salaryForm" class="space-y-3"><select name="position" class="w-full px-3 py-2 border rounded-lg text-sm">${['CEO/Founder','CTO','CFO','Manager','Senior Developer','Developer','Accountant'].map(p=>`<option>${p}</option>`).join('')}</select><select name="tier" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="A">Tier A (x0.8)</option><option value="B" selected>Tier B (x1.0)</option><option value="C">Tier C (x1.3)</option><option value="D">Tier D (x1.5)</option></select><div class="flex gap-2"><input type="number" name="milestone_achievement" placeholder="Milestone %" min="0" max="100" value="60" class="w-full px-3 py-2 border rounded-lg text-sm"><select name="region" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="cairo">Cairo</option><option value="alexandria">Alexandria</option><option value="delta">Delta</option><option value="upper_egypt">Upper Egypt</option></select></div><input type="number" name="company_profitability" placeholder="Profitability %" value="50" class="w-full px-3 py-2 border rounded-lg text-sm"><button type="submit" class="btn-primary w-full py-2 text-sm">Calculate</button></form><div id="salaryResult" class="mt-3"></div></div>
      <div class="bg-white rounded-2xl border p-6"><h3 class="font-bold mb-4"><i class="fas fa-receipt mr-2 text-red-500"></i>Tax Calculator</h3><form id="taxForm" class="space-y-3"><input type="number" name="amount" placeholder="Amount (EGP)" class="w-full px-3 py-2 border rounded-lg text-sm" required><select name="tax_type" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="capital_gains">Capital Gains</option><option value="dividend_withholding">Dividend Withholding</option><option value="vat">VAT</option></select><select name="entity_type" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="individual">Individual (14%)</option><option value="company">Company (22.5%)</option></select><button type="submit" class="btn-primary w-full py-2 text-sm">Calculate</button></form><div id="taxResult" class="mt-3"></div></div>
      <div class="bg-white rounded-2xl border p-6"><h3 class="font-bold mb-4"><i class="fas fa-star mr-2 text-amber-500"></i>Reputation Calculator</h3><form id="reputationForm" class="space-y-3"><select name="user_type" class="w-full px-3 py-2 border rounded-lg text-sm" onchange="updateRepFields(this.value)"><option value="investor">Investor</option><option value="founder">Founder</option><option value="board_member">Board Member</option></select><div id="repFields"></div><button type="submit" class="btn-primary w-full py-2 text-sm">Calculate</button></form><div id="reputationResult" class="mt-3"></div></div>
    </div></div>`;
}

function renderAdmin() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto fade-in">
    <h1 class="text-2xl font-bold mb-6"><i class="fas fa-cog mr-2 text-red-500"></i>JOZOUR Admin Panel</h1>
    <div class="flex gap-2 mb-6 flex-wrap">${['overview','users','projects','audit','regulator','jozour-terms'].map(s=>`<button onclick="loadAdminSection('${s}')" class="px-4 py-2 ${s==='overview'?'bg-blue-600 text-white':'bg-white border border-slate-200 hover:border-blue-500'} rounded-lg text-sm font-medium capitalize">${s.replace(/-/g,' ')}</button>`).join('')}</div>
    <div id="adminContent"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i></div></div></div>`;
}

async function loadAdminSection(s) {
  const c = document.getElementById('adminContent'); if (!c) return;
  c.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i></div>';
  try {
    if (s === 'overview') { const d = await api('/api/admin/overview'); c.innerHTML = renderAdminDash(d); }
    else if (s === 'users') {
      const d = await api('/api/admin/users');
      c.innerHTML = `<div class="bg-white rounded-xl border overflow-hidden"><div class="p-4 border-b"><h3 class="font-bold">Users (${d.total})</h3></div><div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-slate-50 text-left"><th class="p-3">Name</th><th class="p-3">Email</th><th class="p-3">Role</th><th class="p-3">Status</th><th class="p-3">Score</th><th class="p-3">Actions</th></tr></thead><tbody>${(d.users||[]).map(u=>`<tr class="border-t hover:bg-slate-50"><td class="p-3 font-medium">${u.full_name}</td><td class="p-3 text-slate-500">${u.email}</td><td class="p-3"><span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">${u.role}</span></td><td class="p-3"><span class="px-2 py-1 ${u.verification_status==='verified'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'} rounded-full text-xs">${u.verification_status}</span></td><td class="p-3">${u.reputation_score}</td><td class="p-3">${u.verification_status!=='verified'?`<button onclick="adminKYC(${u.id},'approve')" class="text-xs text-emerald-600 hover:underline mr-2">Approve</button><button onclick="adminKYC(${u.id},'reject')" class="text-xs text-red-600 hover:underline">Reject</button>`:'-'}</td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (s === 'projects') {
      const d = await api('/api/admin/projects');
      c.innerHTML = `<div class="bg-white rounded-xl border overflow-hidden"><div class="p-4 border-b"><h3 class="font-bold">All Projects</h3></div>${(d.projects||[]).map(p=>`<div class="p-4 border-b hover:bg-slate-50 flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl tier-badge-${p.tier} flex items-center justify-center text-white font-bold">${p.tier}</div><div><div class="font-bold cursor-pointer hover:text-blue-600" onclick="navigate('project-detail',{id:${p.id}})">${p.title}</div><div class="text-xs text-slate-500">${p.founder_name} · ${(p.status||'').replace(/_/g,' ')} · ${formatEGP(p.funding_raised)}/${formatEGP(p.funding_goal)}</div></div></div><div class="flex gap-2 items-center">${p.status!=='frozen'?`<button onclick="adminFreeze(${p.id})" class="btn-danger text-xs py-1 px-3"><i class="fas fa-snowflake mr-1"></i>Freeze</button>`:'<span class="text-xs text-red-500 font-bold">FROZEN</span>'}</div></div>`).join('')}</div>`;
    } else if (s === 'audit') {
      const d = await api('/api/admin/audit-log');
      c.innerHTML = `<div class="bg-white rounded-xl border overflow-hidden"><div class="p-4 border-b"><h3 class="font-bold"><i class="fas fa-link mr-2 text-purple-500"></i>Immutable Audit Log</h3></div><div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="bg-slate-50"><th class="p-3 text-left">ID</th><th class="p-3 text-left">Action</th><th class="p-3 text-left">Entity</th><th class="p-3 text-left">Actor</th><th class="p-3 text-left">Hash</th><th class="p-3 text-left">Time</th></tr></thead><tbody>${(d.audit_log||[]).map(l=>`<tr class="border-t hover:bg-slate-50"><td class="p-3 font-mono">#${l.id}</td><td class="p-3 font-medium">${l.action}</td><td class="p-3">${l.entity_type} #${l.entity_id}</td><td class="p-3">${l.actor_name||'System'}</td><td class="p-3 font-mono text-purple-600">${(l.output_hash||'').substring(0,12)}...</td><td class="p-3 text-slate-500">${timeAgo(l.created_at)}</td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (s === 'regulator') {
      const d = await api('/api/dashboard/regulator');
      c.innerHTML = renderRegulatorDash(d);
    } else if (s === 'jozour-terms') {
      const d = await api('/api/constitution/jozour-terms');
      c.innerHTML = `<div class="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6"><h3 class="font-bold text-purple-800"><i class="fas fa-shield mr-2"></i>JOZOUR Board Terms Tracker</h3><p class="text-sm text-purple-600 mt-1">Monitor 5-year board seats and veto status across all projects.</p></div>
        <div class="bg-white rounded-xl border overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-slate-50"><th class="p-3 text-left">Project</th><th class="p-3">Tier</th><th class="p-3">Commission</th><th class="p-3">Equity</th><th class="p-3">Veto</th><th class="p-3">Term Start</th><th class="p-3">Term End</th><th class="p-3">Status</th></tr></thead><tbody>${(d.jozour_board_terms||[]).map(t=>`<tr class="border-t hover:bg-slate-50"><td class="p-3 font-medium">${t.title}</td><td class="p-3 text-center"><span class="px-2 py-0.5 tier-badge-${t.tier} text-white text-xs rounded">${t.tier}</span></td><td class="p-3 text-center text-emerald-600 font-bold">${t.jozour_commission_percent||0}%</td><td class="p-3 text-center text-purple-600 font-bold">${t.jozour_equity_percent||0}%</td><td class="p-3 text-center">${t.jozour_veto_active?'<span class="text-red-600 font-bold">Active</span>':'<span class="text-slate-400">None</span>'}</td><td class="p-3 text-center text-xs">${formatDate(t.jozour_board_term_start||t.term_start)}</td><td class="p-3 text-center text-xs">${formatDate(t.jozour_board_term_end||t.term_end)}</td><td class="p-3 text-center"><span class="px-2 py-0.5 ${t.board_status==='active'?'bg-emerald-100 text-emerald-700':t.board_status==='pending_renewal_vote'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-500'} text-xs rounded-full">${t.board_status||t.status||'-'}</span></td></tr>`).join('')}</tbody></table></div></div>
        <button onclick="checkJozourTerms()" class="btn-primary mt-4"><i class="fas fa-sync mr-1"></i>Check for Expiring Terms & Trigger Votes</button>
        <div id="termCheckResult" class="mt-3"></div>`;
    }
  } catch (e) { c.innerHTML = `<div class="text-center py-10 text-red-500">${e.message}</div>`; }
}

function renderNotifications() {
  return `${renderNav()}<div class="pt-20 pb-8 px-4 sm:px-6 max-w-3xl mx-auto fade-in">
    <div class="flex items-center justify-between mb-6"><h1 class="text-2xl font-bold"><i class="fas fa-bell mr-2 text-amber-500"></i>Notifications</h1><button onclick="markAllRead()" class="btn-secondary text-sm">Mark All Read</button></div>
    <div id="notifContent"><div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i></div></div></div>`;
}

async function loadNotifications() {
  const c = document.getElementById('notifContent'); if (!c) return;
  try {
    const d = await api('/api/governance/notifications');
    c.innerHTML = (d.notifications||[]).length===0?'<div class="text-center py-16 text-slate-400"><i class="fas fa-bell-slash text-3xl mb-3"></i><p>No notifications</p></div>':'';
    c.innerHTML += (d.notifications||[]).map(n=>`<div class="bg-white rounded-xl border ${n.read_status?'border-slate-200':'border-blue-300 bg-blue-50'} p-4 mb-3 card-hover"><div class="flex items-start gap-3"><div class="w-10 h-10 rounded-xl ${n.read_status?'bg-slate-100':'bg-blue-100'} flex items-center justify-center flex-shrink-0"><i class="fas ${n.notification_type==='vote_notice'?'fa-gavel text-blue-500':n.notification_type==='jozour_info'?'fa-shield text-amber-500':'fa-bell text-slate-400'}"></i></div><div class="flex-1"><div class="font-medium text-slate-800">${n.title}</div><div class="text-sm text-slate-600 mt-1">${n.message}</div><div class="text-xs text-slate-400 mt-2">${n.project_title||''} · ${timeAgo(n.created_at)}</div></div>${!n.read_status?`<button onclick="markRead(${n.id})" class="text-xs text-blue-600">Mark read</button>`:''}</div></div>`).join('');
  } catch (e) { c.innerHTML = `<div class="text-red-500">${e.message}</div>`; }
}

// ============ Event Handlers ============
function attachEvents() {
  const authForm = document.getElementById('authForm');
  if (authForm) authForm.onsubmit = async (e) => {
    e.preventDefault(); const form = new FormData(authForm); const data = Object.fromEntries(form); const err = document.getElementById('authError'); err?.classList.add('hidden');
    try {
      const isLogin = currentPage === 'login'; const r = await api(`/api/auth/${isLogin?'login':'register'}`, { method: 'POST', body: JSON.stringify(data) });
      currentToken = r.token; localStorage.setItem('sherketi_token', currentToken);
      if (r.user) currentUser = r.user; else { const me = await api('/api/auth/me'); currentUser = me.user; }
      navigate('dashboard');
    } catch (er) { if (err) { err.textContent = er.message; err.classList.remove('hidden'); } }
  };

  const createForm = document.getElementById('createProjectForm');
  if (createForm) createForm.onsubmit = async (e) => {
    e.preventDefault(); const form = new FormData(createForm); const data = Object.fromEntries(form);
    const titles = document.querySelectorAll('.milestone-title'); const amounts = document.querySelectorAll('.milestone-amount');
    const milestones = []; titles.forEach((t,i) => { if (t.value) milestones.push({ title: t.value, amount: parseFloat(amounts[i]?.value)||0 }); });
    data.milestones = milestones; data.funding_goal = parseFloat(data.funding_goal); data.equity_offered = parseFloat(data.equity_offered); data.min_investment = parseFloat(data.min_investment)||50;
    const err = document.getElementById('createError'); const suc = document.getElementById('createSuccess'); err?.classList.add('hidden'); suc?.classList.add('hidden');
    try {
      const r = await api('/api/projects', { method: 'POST', body: JSON.stringify(data) });
      const rev = await api(`/api/projects/${r.projectId}/submit-review`, { method: 'POST' });
      if (suc) { suc.innerHTML = `<i class="fas fa-check-circle mr-1"></i>${r.message}<br><strong>AI Score: ${rev.score||'N/A'}/100</strong><br>JOZOUR: ${r.jozour_fee?.commission} commission + ${r.jozour_fee?.equity} equity<br><button onclick="navigate('project-detail',{id:${r.projectId}})" class="btn-primary text-xs mt-2">View Project</button>`; suc.classList.remove('hidden'); }
    } catch (er) { if (err) { err.textContent = er.message; err.classList.remove('hidden'); } }
  };

  // AI forms
  const valForm = document.getElementById('valuationForm');
  if (valForm) valForm.onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(valForm)); f.funding_goal = parseFloat(f.funding_goal); f.feasibility_score = parseFloat(f.feasibility_score);
    try { const r = await api('/api/ai/valuation', { method:'POST', body:JSON.stringify(f) }); document.getElementById('valuationResult').innerHTML = `<div class="p-3 bg-blue-50 rounded-lg text-sm space-y-1"><div class="font-bold text-lg text-blue-800">${formatEGP(r.pre_money_valuation)}</div><div class="text-blue-600">Post-Money: ${formatEGP(r.post_money_valuation)} · Investor: ${r.investor_equity_percent}%</div><div class="text-xs text-purple-600 mt-2"><strong>JOZOUR:</strong> ${r.jozour_fees?.cash_commission?.percent} commission (${formatEGP(r.jozour_fees?.cash_commission?.amount)}) + ${r.jozour_fees?.equity_stake?.percent} equity · Board: ${r.jozour_fees?.board_seat}</div></div>`; } catch (e) { document.getElementById('valuationResult').innerHTML = `<div class="text-red-500 text-sm">${e.message}</div>`; }
  };
  const salForm = document.getElementById('salaryForm');
  if (salForm) salForm.onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(salForm)); f.milestone_achievement = parseFloat(f.milestone_achievement); f.company_profitability = parseFloat(f.company_profitability);
    try { const r = await api('/api/ai/salary', { method:'POST', body:JSON.stringify(f) }); document.getElementById('salaryResult').innerHTML = `<div class="p-3 bg-amber-50 rounded-lg text-sm"><div class="font-bold text-lg text-amber-800">${formatEGP(r.calculated_salary)}/month</div><div class="grid grid-cols-2 gap-1 mt-2 text-xs">${Object.entries(r.breakdown).map(([k,v])=>`<div><span class="text-slate-500">${k.replace(/_/g,' ')}:</span> ${v}</div>`).join('')}</div></div>`; } catch (e) { document.getElementById('salaryResult').innerHTML = `<div class="text-red-500 text-sm">${e.message}</div>`; }
  };
  const txForm = document.getElementById('taxForm');
  if (txForm) txForm.onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(txForm)); f.amount = parseFloat(f.amount);
    try { const r = await api('/api/ai/tax-calculate', { method:'POST', body:JSON.stringify(f) }); document.getElementById('taxResult').innerHTML = `<div class="p-3 bg-red-50 rounded-lg text-sm"><div class="flex justify-between"><span>Gross</span><span class="font-bold">${formatEGP(r.gross_amount)}</span></div><div class="flex justify-between"><span>Tax (${r.tax_rate})</span><span class="font-bold text-red-600">-${formatEGP(r.tax_amount)}</span></div><div class="flex justify-between border-t mt-1 pt-1"><span>Net</span><span class="font-bold text-emerald-600">${formatEGP(r.net_amount)}</span></div><div class="text-xs text-slate-500 mt-1">${r.form} · ${r.authority}</div></div>`; } catch (e) { document.getElementById('taxResult').innerHTML = `<div class="text-red-500 text-sm">${e.message}</div>`; }
  };

  if (currentPage === 'dashboard') setTimeout(loadDashboardData, 100);
  if (currentPage === 'projects') setTimeout(() => filterProjects(), 100);
  if (currentPage === 'project-detail') setTimeout(loadProjectDetail, 100);
  if (currentPage === 'constitution') setTimeout(loadConstitution, 100);
  if (currentPage === 'market') setTimeout(loadMarketData, 100);
  if (currentPage === 'admin') setTimeout(() => loadAdminSection('overview'), 100);
  if (currentPage === 'ai-tools') setTimeout(initAITools, 100);
  if (currentPage === 'notifications') setTimeout(loadNotifications, 100);
}

function initAITools() { updateRepFields('investor'); }

function updateRepFields(type) {
  const c = document.getElementById('repFields'); if (!c) return;
  const fields = { investor: ['commitment_fulfillment','payment_timeliness','governance_participation','holding_period','investment_diversity','feedback_quality'], founder: ['project_profitability','governance_compliance','financial_transparency','multiple_projects','investor_satisfaction','long_term_commitment'], board_member: ['participation_quorum','voting_quality','dispute_resolution','strategic_contributions','compliance_timeliness'] };
  c.innerHTML = (fields[type]||[]).map(f=>`<div class="flex items-center gap-2"><label class="text-xs text-slate-500 capitalize w-36">${f.replace(/_/g,' ')}</label><input type="range" name="${f}" min="0" max="100" value="50" class="flex-1 h-1"><span class="text-xs font-mono w-8">50</span></div>`).join('');
  c.querySelectorAll('input[type=range]').forEach(inp => { inp.oninput = () => { inp.nextElementSibling.textContent = inp.value; }; });
  const repForm = document.getElementById('reputationForm');
  if (repForm) repForm.onsubmit = async (e) => { e.preventDefault(); const form = new FormData(repForm); const user_type = form.get('user_type'); const metrics = {};
    (fields[user_type]||[]).forEach(f => { metrics[f] = parseFloat(form.get(f))||50; });
    try { const r = await api('/api/ai/reputation', { method:'POST', body:JSON.stringify({ user_type, metrics }) }); document.getElementById('reputationResult').innerHTML = `<div class="p-3 bg-amber-50 rounded-lg text-center"><div class="text-3xl font-black ${r.reputation_score>=70?'text-emerald-600':r.reputation_score>=50?'text-amber-600':'text-red-600'}">${r.reputation_score}</div><div class="text-sm font-medium">${r.tier}</div></div>`; } catch (e) { document.getElementById('reputationResult').innerHTML = `<div class="text-red-500 text-sm">${e.message}</div>`; }
  };
}

function updateTierInfo(tier) {
  const c = document.getElementById('tierInfo'); if (!c) return;
  const info = { A: 'JOZOUR takes 2.5% cash commission + 2.5% equity + 5yr board seat with veto.', B: 'JOZOUR takes 2.5% cash commission + 2.5% equity + 5yr board seat with veto.', C: 'JOZOUR takes 2.5% cash commission + 2.5% equity + 5yr board seat with veto.', D: 'JOZOUR takes 2.5% cash commission ONLY. No equity, no board seat (existing company).' };
  c.innerHTML = `<i class="fas fa-info-circle text-purple-500 mr-1"></i><strong>Tier ${tier}:</strong> ${info[tier]}`;
}

// ============ Actions ============
function addMilestone() {
  const c = document.getElementById('milestonesContainer'); if (!c) return;
  const div = document.createElement('div'); div.className = 'flex gap-2';
  div.innerHTML = `<input type="text" placeholder="Milestone title" class="milestone-title flex-1 px-3 py-2 border rounded-lg text-sm"><input type="number" placeholder="Amount EGP" class="milestone-amount w-32 px-3 py-2 border rounded-lg text-sm"><button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button>`;
  c.appendChild(div);
}

async function autoApproveKYC() {
  try { await api('/api/auth/kyc/auto-approve', { method:'POST' }); const me = await api('/api/auth/me'); currentUser = me.user; navigate('dashboard'); showToast('KYC verified (demo)', 'success'); } catch (e) { showToast(e.message, 'error'); }
}

async function investInProject(id) {
  const amount = parseFloat(document.getElementById('investAmount')?.value);
  if (!amount || amount < 50) { showToast('Minimum investment is 50 EGP', 'error'); return; }
  try { const r = await api(`/api/projects/${id}/invest`, { method:'POST', body:JSON.stringify({ amount }) }); showToast(`Invested! ${r.equity_percentage}% equity, ${r.shares} shares. Transfer to law firm within 48h.`, 'success'); setTimeout(loadProjectDetail, 1000); } catch (e) { showToast(e.message, 'error'); }
}

async function expressInterest(id) {
  const amount = parseFloat(document.getElementById('pledgeAmount')?.value)||0;
  try { const r = await api(`/api/projects/${id}/interest`, { method:'POST', body:JSON.stringify({ pledge_amount: amount }) }); showToast(`Interest recorded! ${r.interest_votes} votes. ${r.threshold_met?'THRESHOLD MET!':''}`, 'success'); setTimeout(loadProjectDetail, 1000); } catch (e) { showToast(e.message, 'error'); }
}

async function castVote(voteId, decision) {
  try { const r = await api(`/api/governance/votes/${voteId}/cast`, { method:'POST', body:JSON.stringify({ decision }) }); showToast(`Vote: ${decision}. Power: ${formatPercent(r.voting_power)}.${r.vetoed?' VETOED by JOZOUR!':''}${r.resolved?' Resolved!':''}`, r.vetoed?'error':'success'); setTimeout(loadDashboardData, 500); } catch (e) { showToast(e.message, 'error'); }
}

async function buyShares(orderId) {
  try { const r = await api(`/api/market/buy/${orderId}`, { method:'POST' }); showToast(r.message, 'success'); setTimeout(loadMarketData, 1000); } catch (e) { showToast(e.message, 'error'); }
}

async function adminKYC(userId, action) {
  try { await api(`/api/admin/users/${userId}/kyc`, { method:'POST', body:JSON.stringify({ action }) }); showToast(`User KYC ${action}d`, 'success'); setTimeout(() => loadAdminSection('users'), 500); } catch (e) { showToast(e.message, 'error'); }
}

async function adminFreeze(projectId) {
  const reason = prompt('Enter freeze reason:'); if (!reason) return;
  try { await api(`/api/admin/projects/${projectId}/freeze`, { method:'POST', body:JSON.stringify({ reason }) }); showToast('Project frozen.', 'success'); setTimeout(() => loadAdminSection('projects'), 500); } catch (e) { showToast(e.message, 'error'); }
}

async function checkJozourTerms() {
  try { const r = await api('/api/governance/check-jozour-terms', { method:'POST' }); const c = document.getElementById('termCheckResult');
    if (c) c.innerHTML = `<div class="p-3 ${r.triggered>0?'bg-amber-50 border-amber-200':'bg-emerald-50 border-emerald-200'} border rounded-lg text-sm">${r.triggered>0?`<i class="fas fa-exclamation-triangle text-amber-500 mr-1"></i>${r.triggered} retention vote(s) triggered!`:'<i class="fas fa-check-circle text-emerald-500 mr-1"></i>No expiring terms found.'}</div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function markRead(id) {
  try { await api(`/api/governance/notifications/${id}/read`, { method:'POST' }); loadNotifications(); } catch {}
}
async function markAllRead() {
  try { await api('/api/governance/notifications/read-all', { method:'POST' }); loadNotifications(); showToast('All notifications marked as read', 'success'); } catch {}
}

function logout() { currentUser = null; currentToken = null; localStorage.removeItem('sherketi_token'); navigate('landing'); }

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl text-white font-medium text-sm fade-in max-w-md ${type==='success'?'bg-emerald-600':type==='error'?'bg-red-600':'bg-blue-600'}`;
  toast.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'} mr-2"></i>${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// Init
init();
