'use client';

import { useSearchParams } from 'next/navigation';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const isError = status === 'error';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100 transition-all transform hover:scale-[1.01]">
        
        {isError ? (
          /* Error State UI */
          <>
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-extrabold border border-rose-100 animate-pulse">
              ✕
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-800 tracking-tight">Connection Failed</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              We encountered a configuration or database timeout issue while trying to securely store your integration authentication tokens.
            </p>
            <a 
              href="/settings"
              className="inline-block w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Go Back & Try Again
            </a>
          </>
        ) : (
          /* Success State UI */
          <>
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-extrabold border border-emerald-100">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-800 tracking-tight">Bridge Connected!</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Your QuickBooks account authorization was successful. The background tokens have been securely initialized inside your Supabase cluster.
            </p>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-6">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider mb-1">Active Scope</span>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 inline-block">
                Clockify Marketplace Integration MVP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              You can now safely close this secure tab and return to your main Clockify organization window.
            </p>
          </>
        )}

      </div>
    </div>
  );
}
