'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Klijentska inicijalizacija Supabase-a (koristimo anon key jer samo čitamo)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function QbStatusBadge() {
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        // Clockify prosleđuje token sa podacima o fakturi u URL-u komponente
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setIsLoading(false);
          return;
        }

        // Dekodiramo payload iz JWT tokena bez verifikacije potpisa
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        
        // Izvlačimo ID fakture iz payload-a
        const invoiceId = payload.invoiceId || payload.id || payload.entityId;

        if (invoiceId) {
          // Pitamo isključivo NAŠU bazu da li smo ovu fakturu već poslali
          const { data } = await supabase
            .from('synced_invoices')
            .select('clockify_invoice_id')
            .eq('clockify_invoice_id', invoiceId)
            .single();

          if (data) {
            setIsSynced(true);
          }
        }
      } catch (error) {
        console.error("Greška pri proveri statusa:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSyncStatus();
  }, []);

  // Sklanjamo pozadinu i margine da bi se savršeno uklopilo u Clockify tabelu
  if (isLoading) return <div style={{ padding: '4px' }}>...</div>;

  if (isSynced) {
    return (
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        backgroundColor: '#ecfdf5', 
        color: '#059669', 
        border: '1px solid #a7f3d0',
        padding: '2px 8px', 
        borderRadius: '12px', 
        fontSize: '12px', 
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <svg style={{ width: '12px', height: '12px', marginRight: '4px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Synced
      </div>
    );
  }

  // Ako nije sinhronizovano, vraćamo prazan div (ili možeš dodati sivi "Not synced" bedž)
  return <div></div>;
}
