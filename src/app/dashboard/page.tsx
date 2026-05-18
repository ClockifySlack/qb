'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const isError = status === 'error';

  useEffect(() => {
    // Ako je povezivanje uspešno i prozor je otvoren kao popup
    if (!isError && status === 'success' && window.opener) {
      // Šaljemo tajni signal glavnom iframe-u da osveži stanje
      window.opener.postMessage({ type: 'QB_CONNECTED' }, '*');
      
      // Automatski zatvaramo popup prozor nakon 2.5 sekunde da korisnik ne mora sam da klikće
      const timer = setTimeout(() => {
        window.close();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [status, isError]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
        
        {isError ? (
          <>
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-extrabold border border-rose-100 animate-pulse">
              ✕
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-800 tracking-tight">Connection Failed</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              We encountered an issue while trying to securely store your integration authentication tokens.
            </p>
            <button 
              onClick={() => window.close()}
              className="inline-block w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Close Window
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-extrabold border border-emerald-100">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-800 tracking-tight">Bridge Connected!</h2>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Your QuickBooks account authorization was successful.
            </p>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
              <span className="text-xs text-slate-500 block animate-pulse">
                Closing this window automatically...
              </span>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">
        <div className="text-slate-400 text-sm animate-pulse">Loading connection status...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
