export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SHERKETI - AI-Governed Equity Crowdfunding</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Cairo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
            accent: { 50:'#faf5ff',100:'#f3e8ff',200:'#e9d5ff',300:'#d8b4fe',400:'#c084fc',500:'#a855f7',600:'#9333ea',700:'#7e22ce',800:'#6b21a8',900:'#581c87' },
            emerald: { 50:'#ecfdf5',100:'#d1fae5',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857' },
            gold: { 400:'#facc15',500:'#eab308',600:'#ca8a04' }
          },
          fontFamily: {
            inter: ['Inter', 'sans-serif'],
            cairo: ['Cairo', 'sans-serif']
          }
        }
      }
    }
  </script>
  <style>
    * { font-family: 'Inter', sans-serif; }
    .ar-text { font-family: 'Cairo', sans-serif; direction: rtl; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
    .glass { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
    .glass-dark { background: rgba(15,23,42,0.8); backdrop-filter: blur(20px); }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pulse-glow { 0%,100%{box-shadow:0 0 5px rgba(59,130,246,0.3)} 50%{box-shadow:0 0 20px rgba(59,130,246,0.6)} }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    .slide-in { animation: slideIn 0.3s ease-out; }
    .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
    .gradient-text { background: linear-gradient(135deg, #3b82f6, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-gradient { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 30%, #1e40af 60%, #7e22ce 100%); }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .nav-active { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
    .progress-bar { transition: width 0.8s ease-in-out; }
    .tier-badge-A { background: linear-gradient(135deg, #10b981, #059669); }
    .tier-badge-B { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .tier-badge-C { background: linear-gradient(135deg, #a855f7, #7e22ce); }
    .tier-badge-D { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .status-active { background: #10b981; }
    .status-pending { background: #f59e0b; }
    .status-frozen { background: #ef4444; }
    .tooltip { position: relative; }
    .tooltip:hover::after { content: attr(data-tip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; z-index: 50; }
    input:focus, select:focus, textarea:focus { outline: none; ring: 2px; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
    .btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 8px 20px; border-radius: 8px; font-weight: 600; transition: all 0.2s; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
    .btn-secondary { background: white; color: #1e293b; padding: 8px 20px; border-radius: 8px; font-weight: 600; border: 1px solid #e2e8f0; transition: all 0.2s; }
    .btn-secondary:hover { background: #f8fafc; border-color: #3b82f6; }
    .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 8px 20px; border-radius: 8px; font-weight: 600; }
    .sidebar-item { padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; }
    .sidebar-item:hover { background: rgba(59,130,246,0.1); }
    .sidebar-item.active { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
  </style>
</head>
<body class="bg-slate-50 min-h-screen">
  <div id="app"></div>
  <script src="/static/js/app.js"></script>
</body>
</html>`
}
