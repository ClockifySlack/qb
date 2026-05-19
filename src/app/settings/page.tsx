'use client';

import { useEffect, useState } from 'react';

export default function Settings() {
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
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

    window.open(
      '/api/auth/qb',
      'QuickBooksAuthorization',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  // Funkcija koja gađa naš novi backend API
  const handleSyncInvoice = async (invoiceId: string, invoiceNumber: string, amount: number) => {
    setSyncStatus(prev => ({ ...prev, [invoiceId]: 'loading' }));

    try {
      const response = await fetch('/api/sync/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          invoiceNumber,
          amount,
          realmId: "9341457104211536" // Tvoj fiksni testni Sandbox Realm ID
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      setSyncStatus(prev => ({ ...prev, [invoiceId]: 'success' }));
    } catch (error) {
      console.error(error);
      setSyncStatus(prev => ({ ...prev, [invoiceId]: 'error' }));
    }
  };

  // Simulirani podaci dok ne povežemo pravi Clockify API
  const mockInvoices = [
    { id: 'inv_1', number: 'INV-2026-001', client: 'Cake.com HQ', amount: 1980.00, date: '19/05/2026' },
    { id: 'inv_2', number: 'INV-2026-002', client: 'Global Tech LLC', amount: 450.50, date: '18/05/2026' }
  ];

  return (
    <div className="bg-white min-h-screen font-sans antialiased text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <span>Add-ons</span>
          <span>/</span>
          <span className="text-slate-600 font-medium">QuickBooks Payroll Bridge</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Integration Settings</h1>

        {/* OAuth Box */}
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

        {/* Invoices List UI */}
        <div className="border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Invoices</h2>
            <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
              Mock Data Mode
            </span>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Invoice No.</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockInvoices.map((inv) => {
                  const status = syncStatus[inv.id] || 'idle';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{inv.number}</td>
                      <td className="px-6 py-4 text-slate-600">{inv.client}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">${inv.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        {status === 'idle' && (
                          <button 
                            onClick={() => handleSyncInvoice(inv.id, inv.number, inv.amount)}
                            className="text-xs font-medium bg-white text-slate-700 hover:text-cyan-600 border border-slate-200 hover:border-cyan-300 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                          >
                            Sync to QB
                          </button>
                        )}
                        {status === 'loading' && (
                          <span className="text-xs font-medium text-slate-400 flex items-center justify-end space-x-1 animate-pulse">
                            <span>Syncing...</span>
                          </span>
                        )}
                        {status === 'success' && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                            ✓ Synced
                          </span>
                        )}
                        {status === 'error' && (
                          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                            ✕ Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
