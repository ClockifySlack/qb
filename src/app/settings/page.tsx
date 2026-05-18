export default function Settings() {
  return (
    <div className="bg-white min-h-screen font-sans antialiased text-slate-800">
      {/* App-like Container */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Header Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <span>Add-ons</span>
          <span>/</span>
          <span className="text-slate-600 font-medium">QuickBooks Payroll Bridge</span>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Integration Settings</h1>

        {/* Integration Status Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-700 font-bold text-lg hidden sm:block">
              QB
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">QuickBooks Account Authorization</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Grant this add-on access to read Clockify invoices and push data directly into your QuickBooks Sandbox organization accounts.
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <a
              href="/api/auth/qb"
              target="_top"
              className="inline-flex items-center justify-center bg-[#2ca01c] hover:bg-[#1e6b13] text-white font-medium text-sm py-2.5 px-5 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-sans"
            >
              <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              Connect QuickBooks
            </a>
          </div>
        </div>

        {/* Permissions Scope Notice */}
        <div className="border-t border-slate-100 pt-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Required Permissions</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center text-slate-700">
              <span className="text-emerald-500 mr-2">✓</span> Read active Clockify workspace information.
            </li>
            <li className="flex items-center text-slate-700">
              <span className="text-emerald-500 mr-2">✓</span> Access, export, and format internal financial invoice records.
            </li>
            <li className="flex items-center text-slate-700">
              <span className="text-emerald-500 mr-2">✓</span> Generate secure callback logs between server environments.
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
