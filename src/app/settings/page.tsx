'use client';

import { useEffect, useState } from 'react';

export default function Settings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  
  // DODATO: Novi status 'already_synced' u tipizaciju
  const [syncStatus, setSyncStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error' | 'already_synced'>>({});
  
  const [applyTax, setApplyTax] = useState(true);
  const [isUpdatingTax, setIsUpdatingTax] = useState(false);
  const [markAsSent, setMarkAsSent] = useState(true);
  const [isUpdatingSent, setIsUpdatingSent] = useState(false);

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

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
            
            // AZURIRANO: Logika za prepoznavanje već poslatih faktura
            const initialSyncStatus: Record<string, 'idle' | 'loading' | 'success' | 'error' | 'already_synced'> = {};
            data.forEach((inv) => {
              // Ako tvoj backend vraća isSynced: true ili ako je status fakture u Clockify-ju 'SENT'
              if (inv.isSynced || inv.status === 'SENT') {
                initialSyncStatus[inv.id] = 'already_synced';
              }
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

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/auth/disconnect', { method: 'POST' });
      if (response.ok) {
        setIsConnected(false);
        setInvoices([]);
        setShowDisconnectModal(false);
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
    <div className="bg-white min-h-screen font-sans antialiased text-[#393A3D] relative">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <span>Add-ons</span><span>/</span><span className="text-[#393A3D] font-medium">QuickBooks Payroll Bridge</span>
        </div>
        <h1 className="text-2xl font-bold text-[#393A3D] mb-6">Integration Settings</h1>

        <div className="bg-slate-50 border border-[#D4D7DC] rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className={`p-2.5 rounded-lg font-bold text-lg hidden sm:block ${isConnected ? 'bg-emerald-100 text-[#2CA01C]' : 'bg-amber-100 text-amber-700'}`}>
              QB
            </div>
            <div>
              <h3 className="font-semibold text-[#393A3D]">
                {isCheckingStatus ? 'Loading status...' : isConnected ? 'QuickBooks Connected' : 'QuickBooks Account Authorization'}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {isConnected ? 'Your Clockify workspace is successfully linked with QuickBooks Payroll Bridge.' : 'Grant this add-on access to read Clockify invoices and push data directly into your QuickBooks Sandbox organization accounts.'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {isCheckingStatus ? (<span className="inline-flex items-center text-sm text-slate-400 animate-pulse">Checking...</span>) : isConnected ? (
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center bg-emerald-50 px-3 py-2 text-sm font-semibold text-[#2CA01C] ring-1 ring-inset ring-[#2CA01C]/20 rounded-full">✓ Connected</span>
                <button 
                  onClick={handleDisconnectClick}
                  disabled={isDisconnecting}
                  className="inline-flex items-center justify-center bg-white border border-[#D4D7DC] hover:bg-[#F4F5F8] text-[#393A3D] font-semibold text-sm py-2 px-4 rounded-full transition-colors shadow-sm focus:outline-none"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={openAuthPopup} 
                className="inline-flex items-center justify-center bg-[#2CA01C] hover:bg-[#1D8011] text-white font-semibold text-sm py-2.5 px-6 rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2CA01C]"
              >
                Connect to QuickBooks
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-[#D4D7DC] pt-8">
          {isConnected ? (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-white border border-[#D4D7DC] rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
                  <div className="pr-4">
                    <h3 className="font-semibold text-[#393A3D]">QuickBooks Automatic Tax</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">When sending an invoice, allow QuickBooks to automatically calculate and apply the appropriate tax rate.</p>
                  </div>
                  <button onClick={handleTaxToggle} disabled={isUpdatingTax} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2CA01C] focus:ring-offset-2 ${applyTax ? 'bg-[#2CA01C]' : 'bg-[#D4D7DC]'} ${isUpdatingTax ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${applyTax ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="bg-white border border-[#D4D7DC] rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
                  <div className="pr-4">
                    <h3 className="font-semibold text-[#393A3D]">Mark as Sent in Clockify</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">Automatically change the invoice status to "SENT" in Clockify after successfully syncing it.</p>
                  </div>
                  <button onClick={handleSentToggle} disabled={isUpdatingSent} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2CA01C] focus:ring-offset-2 ${markAsSent ? 'bg-[#2CA01C]' : 'bg-[#D4D7DC]'} ${isUpdatingSent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${markAsSent ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#393A3D]">Recent Invoices</h2>
              </div>
              
              <div className="bg-white border border-[#D4D7DC] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-[#393A3D] text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Invoice No.</th>
                      <th className="px-6 py-4 font-semibold">Client</th>
                      <th className="px-6 py-4 font-semibold">Amount</th>
                      <th className="px-6 py-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4D7DC]">
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
                                <button onClick={() => handleSyncInvoice(inv.id, inv.number, inv.amount, inv.client)} className="text-xs font-semibold bg-white text-[#393A3D] border border-[#D4D7DC] px-4 py-1.5 rounded-full hover:bg-[#F4F5F8] transition-colors">Sync to QB</button>
                              )}
                              {status === 'loading' && (<span className="text-xs font-medium text-slate-400 animate-pulse">Syncing...</span>)}
                              {status === 'success' && (<span className="text-xs font-medium text-[#2CA01C] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">✓ Synced</span>)}
                              {status === 'error' && (<span className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">✕ Failed</span>)}
                              {/* DODATO: Prikaz za fakture koje su već odranije poslate */}
                              {status === 'already_synced' && (
                                <span className="inline-block text-xs font-semibold text-slate-500 bg-[#F4F5F8] px-4 py-1.5 rounded-full border border-[#D4D7DC] opacity-80 cursor-not-allowed">
                                  Already Synced
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                
                {invoices.length > invoicesPerPage && (
                  <div className="bg-slate-50 px-6 py-3 border-t border-[#D4D7DC] flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        Showing <span className="font-semibold text-[#393A3D]">{indexOfFirstInvoice + 1}</span> to <span className="font-semibold text-[#393A3D]">{Math.min(indexOfLastInvoice, invoices.length)}</span> of <span className="font-semibold text-[#393A3D]">{invoices.length}</span> results
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="px-4 py-1.5 border border-[#D4D7DC] text-xs font-semibold rounded-full text-[#393A3D] bg-white hover:bg-[#F4F5F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="px-4 py-1.5 border border-[#D4D7DC] text-xs font-semibold rounded-full text-[#393A3D] bg-white hover:bg-[#F4F5F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-[#D4D7DC] p-10 text-center rounded-xl"><span className="text-4xl opacity-50">🔒</span><p className="mt-2 text-sm text-[#393A3D]">Please connect your QuickBooks account.</p></div>
          )}
        </div>
      </div>

      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-[#393A3D] mb-2">Disconnect QuickBooks?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to disconnect? This will revoke access and you will need to reconnect to sync invoices in the future.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowDisconnectModal(false)}
                disabled={isDisconnecting}
                className="px-5 py-2 text-sm font-semibold text-[#393A3D] bg-white border border-[#D4D7DC] rounded-full hover:bg-[#F4F5F8] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                disabled={isDisconnecting}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 border border-transparent rounded-full hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
