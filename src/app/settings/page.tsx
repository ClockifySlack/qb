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

  // NOVO: State za status fakture
  const [markAsSent, setMarkAsSent] = useState(true);
  const [isUpdatingSent, setIsUpdatingSent] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.isConnected) {
          setIsConnected(true);
        }
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

  // API putanja promenjena na /preferences
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
      
      // DODATO: Čim imamo token, čuvamo ga u bazu u pozadini!
      fetch('/api/settings/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken })
      }).catch(console.error);

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
        .catch(err => {
          setInvoiceError(err.message);
        })
        .finally(() => {
          setIsLoadingInvoices(false);
        });
    }
  }, [isConnected]);

  const openAuthPopup = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open('/api/auth/qb', 'QuickBooksAuthorization', `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
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
    } catch (err) {
      console.error(err);
      setApplyTax(!newValue);
    } finally {
      setIsUpdatingTax(false);
    }
  };

  // NOVO: Funkcija za menjanje status postavke
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
    } catch (err) {
      console.error(err);
      setMarkAsSent(!newValue);
    } finally {
      setIsUpdatingSent(false);
    }
  };

  const handleSyncInvoice = async (invoiceId: string, invoiceNumber: string, amount: number) => {
    setSyncStatus(prev => ({ ...prev, [invoiceId]: 'loading' }));
    try {
      const response = await fetch('/api/sync/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, invoiceNumber, amount, realmId: "9341457104211536" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to sync');
      setSyncStatus(prev => ({ ...prev, [invoiceId]: 'success' }));
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, [invoiceId]: 'error' }));
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans antialiased text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <span>Add-ons</span>
