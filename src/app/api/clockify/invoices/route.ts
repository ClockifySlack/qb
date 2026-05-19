export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Čitamo workspaceId iz query parametra koji nam šalje frontend
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Nedostaje workspaceId' }, { status: 400 });
    }

    // 1. Povlačimo oficijelni add-on token iz naše baze
    const { data: tokenData, error: dbError } = await supabase
      .from('clockify_tokens')
      .select('addon_token')
      .eq('workspace_id', workspaceId)
      .single();

    if (dbError || !tokenData) {
      return NextResponse.json({ error: 'Nije pronađen token za ovaj workspace' }, { status: 401 });
    }

    // 2. Šaljemo zahtev ka Clockify API-ju koristeći X-Addon-Token!
    const response = await fetch(`https://api.clockify.me/api/v1/workspaces/${workspaceId}/invoices`, {
      headers: {
        'X-Addon-Token': tokenData.addon_token,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Neuspešno povlačenje faktura sa Clockify-ja');
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
