'use client';

import { useEffect, useState } from 'react';

export default function Settings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  
  const [applyTax, setApplyTax] = useState(true);
  const [isUpdatingTax, setIsUpdatingTax] = useState(false);
  const [markAsSent, setMarkAsSent] = useState(true);
  const [isUpdatingSent, setIsUpdatingSent] = useState(false);

  // NOVO: State za praćenje gašenja konekcije
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const invoicesPerPage = 20;

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.isConnected) setIsConnected(true);
        setIsCheckingStatus(false);
      })
      .catch(() => setIsCheckingStatus(false));
  }, []);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'QB_CONNECTED') {
        setIsConnected(true);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetch('/api/settings/preferences')
        .then(res => res.json())
        .then(data => {
          setApplyTax(data.applyTax);
          setMarkAsSent(data.markAsSent);
        })
        .catch(console.error);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      setIsLoadingInvoices(true);
      setInvoiceError(null);
      
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');

      if (!authToken) {
          setInvoiceError(`Missing auth_token in URL. Cannot load invoices.`);
          setIsLoadingInvoices(false);
          return;
      }

      fetch(`/api/clockify/invoices?auth_token=${authToken}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Unknown server error');
          if (Array.isArray(data)) {
            setInvoices(data);
            const initialSyncStatus: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
            data.forEach((inv) => {
              if (inv.isSynced) initialSyncStatus[inv.id] = 'success';
            });
            setSyncStatus(initialSyncStatus);
          } else {
            throw new Error('API did not return an array.');
          }
        })
        .catch(err => setInvoiceError(err.message))
        .finally(() => setIsLoadingInvoices(false));
    }
  }, [isConnected]);

  const openAuthPopup = () => {
    const width = 600, height = 700;
    const left = window.screen.width / 2 - width / 2, top = window.screen.height / 2 - height / 2;
    window.open('/api/auth/qb', 'QuickBooksAuthorization', `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
  };

  // NOVO: Funkcija za raskidanje konekcije
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your QuickBooks account? This will revoke all access tokens.")) {
      return;
    }
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/auth/disconnect', { method: 'POST' });
      if (response.ok) {
        setIsConnected(false);
        setInvoices([]);
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTaxToggle = async () => {
    const newValue = !applyTax;
    setApplyTax(newValue);
    setIsUpdatingTax(true);
    try {
      await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyTax: newValue })
      });
    } catch (err) { setApplyTax(!newValue); } 
    finally { setIsUpdatingTax(false); }
  };

  const handleSentToggle = async () => {
    const newValue = !markAsSent;
    setMarkAsSent(newValue);
    setIsUpdatingSent(true);
    try {
      await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsSent: newValue })
      });
    } catch (err) { setMarkAsSent(!newValue); } 
    finally { setIsUpdatingSent(false); }
  };

  const handleSyncInvoice = async (invoiceId: string, invoiceNumber: string, amount: number, clientName: string) => {
    setSyncStatus(prev => ({ ...prev, [invoiceId]: 'loading' }));
    
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token') || "";

    try {
      const response = await fetch('/api/sync/invoice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-addon-token': authToken 
        },
        body: JSON.stringify({ invoiceId, invoiceNumber, amount, clientName, realmId: "9341457104211536" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to sync');
      setSyncStatus(prev => ({ ...prev, [invoiceId]: 'success' }));
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, [invoiceId]: 'error' }));
    }
  };

  const indexOfLastInvoice = currentPage * invoicesPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
  const currentInvoices = invoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
  const totalPages = Math.ceil(invoices.length / invoicesPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="bg-white min-h-screen font-sans antialiased text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <span>Add-ons</span><span>/</span><span className="text-slate-600 font-medium">QuickBooks Payroll Bridge</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Integration Settings</h1>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className={`p-2.5 rounded-lg font-bold text-lg hidden sm:block ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              QB
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {isCheckingStatus ? 'Loading status...' : isConnected ? 'QuickBooks Connected' : 'QuickBooks Account Authorization'}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {isConnected ? 'Your Clockify workspace is successfully linked with QuickBooks Payroll Bridge.' : 'Grant this add-on access to read Clockify invoices and push data directly into your QuickBooks Sandbox organization accounts.'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {isCheckingStatus ? (<span className="inline-flex items-center text-sm text-slate-400 animate-pulse">Checking...</span>) : isConnected ? (
              // ISPRAVLJENO: Dodato Disconnect dugme pored Connected bedža
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 rounded-lg">✓ Connected</span>
                <button 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="inline-flex items-center justify-center bg-white border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-medium text-xs py-2 px-3 rounded-lg transition-colors shadow-sm focus:outline-none"
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <button onClick={openAuthPopup} className="inline-flex items-center justify-center bg-[#2ca01c] hover:bg-[#1e6b13] text-white font-medium text-sm py-2.5 px-5 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">Connect QuickBooks</button>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          {isConnected ? (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
                  <div className="pr-4">
                    <h3 className="font-semibold text-slate-900">QuickBooks Automatic Tax</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">When sending an invoice, allow QuickBooks to automatically calculate and apply the appropriate tax rate.</p>
                  </div>
                  <button onClick={handleTaxToggle} disabled={isUpdatingTax} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${applyTax ? 'bg-emerald-500' : 'bg-slate-300'} ${isUpdatingTax ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${applyTax ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
                  <div className="pr-4">
                    <h3 className="font-semibold text-slate-900">Mark as Sent in Clockify</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">Automatically change the invoice status to "SENT" in Clockify after successfully syncing it.</p>
                  </div>
                  <button onClick={handleSentToggle} disabled={isUpdatingSent} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${markAsSent ? 'bg-emerald-500' : 'bg-slate-300'} ${isUpdatingSent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${markAsSent ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Recent Invoices</h2>
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
                    {isLoadingInvoices ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm animate-pulse">Fetching invoices from Clockify...</td></tr>
                    ) : invoiceError ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center bg-rose-50"><span className="text-rose-600 block">{invoiceError}</span></td></tr>
                    ) : invoices.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">No invoices found.</td></tr>
                    ) : (
                      currentInvoices.map((inv) => {
                        const status = syncStatus[inv.id] || 'idle';
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-medium">{inv.number}</td>
                            <td className="px-6 py-4 text-slate-600">{inv.client}</td>
                            <td className="px-6 py-4 font-medium">${Number(inv.amount).toFixed(2)}</td>
                            <td className="px-6 py-4 text-right">
                              {status === 'idle' && (
                                <button onClick={() => handleSyncInvoice(inv.id, inv.number, inv.amount, inv.client)} className="text-xs font-medium bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-cyan-300">Sync to QB</button>
                              )}
                              {status === 'loading' && (<span className="text-xs font-medium text-slate-400 animate-pulse">Syncing...</span>)}
                              {status === 'success' && (<span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">✓ Synced</span>)}
                              {status === 'error' && (<span className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">✕ Failed</span>)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                
                {invoices.length > invoicesPerPage && (
                  <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        Showing <span className="font-semibold text-slate-700">{indexOfFirstInvoice + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(indexOfLastInvoice, invoices.length)}</span> of <span className="font-semibold text-slate-700">{invoices.length}</span> results
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border p-10 text-center rounded-xl"><span className="text-4xl opacity-50">🔒</span><p className="mt-2 text-sm text-slate-500">Please connect your QuickBooks account.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
