export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authToken = searchParams.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ error: 'Nedostaje auth_token iz URL-a' }, { status: 400 });
    }

    const payloadBase64 = authToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    const workspaceId = payload.workspaceId || payload.workspace_id;
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Nije moguće pročitati workspaceId' }, { status: 400 });
    }

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
      throw new Error(data.message || data.error || `Clockify API error: ${response.status}`);
    }

    if (!Array.isArray(data)) {
        console.error("API odgovor nije niz:", data);
        throw new Error("API nije vratio listu faktura (format nije niz)");
    }

    const formattedInvoices = data.map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      client: inv.clientName || 'Nepoznat klijent',
      amount: inv.total || 0,
      date: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'
    }));

    return NextResponse.json(formattedInvoices);
  } catch (error: any) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
