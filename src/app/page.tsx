export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Header / Navigation bar dummy */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-cyan-500 to-amber-500 p-2 rounded-lg text-white font-black text-sm">
              C•Q
            </div>
            <span className="font-bold text-slate-800 text-lg tracking-tight">CAKE.com Marketplace</span>
          </div>
          <span className="inline-flex items-center bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 rounded-md">
            ● Production Ready
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center my-auto">
        <div className="inline-flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-xs font-semibold text-amber-800 mb-6 shadow-sm">
          <span>🚀 MVP Version 1.0.0</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
          Connect Your <span className="text-cyan-500">Clockify</span> Invoices to <span className="text-emerald-600">QuickBooks</span> Payroll
        </h1>
        
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          The ultimate automation bridge built specifically for the CAKE.com Marketplace. Sync tracked hours, manage payroll workflows, and eliminate double-data entry instantly.
        </p>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xl mb-2">⚡</div>
            <h3 className="font-semibold text-slate-800 mb-1">Instant Sync</h3>
            <p className="text-xs text-slate-500">One-click transfer from Clockify Invoice module directly into QuickBooks.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xl mb-2">🛡️</div>
            <h3 className="font-semibold text-slate-800 mb-1">Secure OAuth 2.0</h3>
            <p className="text-xs text-slate-500">Fully encrypted token storage leveraging enterprise-grade Intuit developer standards.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xl mb-2">📊</div>
            <h3 className="font-semibold text-slate-800 mb-1">Smart Mapping</h3>
            <p className="text-xs text-slate-500">Automatically cross-reference workspaces, user rates, and system currencies configuration.</p>
          </div>
        </div>

        {/* Support Contact Link */}
        <div className="max-w-3xl mx-auto mt-12 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Need help with the integration?{' '}
            <a
              href="mailto:support@automaticon.online"
              className="font-medium text-cyan-600 hover:text-cyan-500 transition-colors"
            >
              Contact Support
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © 2026 QuickBooks Payroll Bridge. Built for CAKE.com Ecosystem. All rights reserved.
      </footer>
    </div>
  );
}
