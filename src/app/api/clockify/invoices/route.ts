export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authToken = searchParams.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ error: 'Nedostaje auth_token' }, { status: 400 });
    }

    const payloadBase64 = authToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    const workspaceId = payload.workspaceId || payload.workspace_id;
    
    const baseUrl = payload.backendUrl || 'https://api.clockify.me/api';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const fetchUrl = `${cleanBaseUrl.replace(/\/api$/, '')}/api/v1/workspaces/${workspaceId}/invoices`;

    const response = await fetch(fetchUrl, {
      headers: {
        'X-Addon-Token': authToken,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Greška: ${response.status}`);
    }

    const invoiceList = Array.isArray(data) ? data : (data.invoices || []);

    if (!Array.isArray(invoiceList)) {
        throw new Error("API nije vratio listu faktura u prepoznatljivom formatu");
    }

    // Povlačimo sve sinhronizovane ID-jeve iz Supabase baze
    const { data: syncedData } = await supabase
      .from('synced_invoices')
      .select('clockify_invoice_id');
      
    const syncedIds = new Set(syncedData?.map(row => row.clockify_invoice_id) || []);

    const formattedInvoices = invoiceList.map((inv: any) => {
      // Clockify uglavnom vraća iznos u 'total', a nekad u 'amount' ili 'balance'
      const amountInCents = inv.total || inv.amount || inv.balance || 0;
      const amountInDollars = amountInCents / 100;

      return {
        id: inv.id || 'N/A',
        number: inv.number || 'N/A',
        client: inv.clientName || 'Nepoznat klijent',
        // Ostavljamo kao broj jer tvoj frontend već radi Number(inv.amount).toFixed(2)
        amount: amountInDollars, 
        date: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-',
        isSynced: syncedIds.has(inv.id),
        status: inv.status // <--- OVO JE NEDOSTAJALO DA BI FRONTEND PREPOZNAO 'SENT' STATUS!
      };
    });

    return NextResponse.json(formattedInvoices);
  } catch (error: any) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
