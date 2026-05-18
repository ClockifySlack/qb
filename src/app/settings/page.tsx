'use client';

import { useEffect, useState } from 'react';

export default function Settings() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Slušamo poruku iz popup prozora da je povezivanje uspešno
    const handleOAuthMessage = (event: MessageEvent) => {
      // Bezbednosna provera: reagujemo samo na naš tip poruke
      if (event.data && event.data.type === 'QB_CONNECTED') {
        setIsConnected(true);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const openAuthPopup = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // Otvaramo našu rutu u nezavisnom popup prozoru
    window.open(
      '/api/auth/qb',
      'QuickBooksAuthorization',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  return (
    <div className="bg-white min-h-screen font-sans antialiased text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <span>Add-ons</span>
          <span>/</span>
          <span className="text-slate-600 font-medium">QuickBooks Payroll Bridge</span>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Integration Settings</h1>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className={`p-2.5 rounded-lg font-bold text-lg hidden sm:block ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              QB
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {isConnected ? 'QuickBooks Connected' : 'QuickBooks Account Authorization'}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {isConnected 
                  ? 'Your Clockify workspace is successfully linked with QuickBooks Payroll Bridge.' 
                  : 'Grant this add-on access to read Clockify invoices and push data directly into your QuickBooks Sandbox organization accounts.'}
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            {isConnected ? (
              <span className="inline-flex items-center bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 rounded-lg">
                ✓ Connected
              </span>
            ) : (
              <button
                onClick={openAuthPopup}
                className="inline-flex items-center justify-center bg-[#2ca01c] hover:bg-[#1e6b13] text-white font-medium text-sm py-2.5 px-5 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-sans"
              >
                Connect QuickBooks
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Required Permissions</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center text-slate-700">
              <span className="text-emerald-500 mr-2">✓</span> Read active Clockify workspace information.
            </li>
            <li className="flex items-center text-slate-700">
              <span className="text-emerald-500 mr-2">✓</span> Access, export, and format internal financial invoice records.
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
