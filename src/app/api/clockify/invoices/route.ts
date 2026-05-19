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
    
    console.log("=== CLOCKIFY TOKEN PAYLOAD ===", JSON.stringify(payload, null, 2));

    const workspaceId = payload.workspaceId || payload.workspace_id;
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Nije moguće pročitati workspaceId iz auth_token-a' }, { status: 400 });
    }

    const baseUrl = payload.backendUrl || 'https://api.clockify.me/api';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    let fetchUrl = '';
    if (cleanBaseUrl.endsWith('/api')) {
       fetchUrl = `${cleanBaseUrl}/v1/workspaces/${workspaceId}/invoices`;
    } else {
       fetchUrl = `${cleanBaseUrl}/api/v1/workspaces/${workspaceId}/invoices`;
    }

    console.log("Gađamo Clockify API:", fetchUrl);

    const response = await fetch(fetchUrl, {
      headers: {
        'X-Addon-Token': authToken,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Clockify API greška detaljno:", errorText);
      throw new Error(`Unauthorized (401): Token odbijen za ${fetchUrl}`);
    }

    const invoices = await response.json();

    const formattedInvoices = invoices.map((inv: any) => ({
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
