export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authToken = searchParams.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ error: 'Nedostaje auth_token iz URL-a' }, { status: 400 });
    }

    // Dekodiranje JWT tokena da izvučemo workspaceId
    // JWT format je: header.payload.signature
    const payloadBase64 = authToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    const workspaceId = payload.workspaceId || payload.workspace_id;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Nije moguće pročitati workspaceId iz auth_token-a' }, { status: 400 });
    }

    // Šaljemo zahtev ka Clockify API-ju koristeći pravi X-Addon-Token
    const response = await fetch(`https://api.clockify.me/api/v1/workspaces/${workspaceId}/invoices`, {
      headers: {
        'X-Addon-Token': authToken,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Clockify API greška: ${response.statusText}`);
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
