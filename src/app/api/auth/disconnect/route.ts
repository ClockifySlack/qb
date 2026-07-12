export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Čitamo body, ali koristimo catch u slučaju da frontend pošalje prazan POST zahtev
    const body = await request.json().catch(() => ({}));
    
    // Dinamičko preuzimanje realmId-ja iz body-ja ili kolačića
    const realmId = body.realmId 
      || request.cookies.get('realmId')?.value 
      || request.cookies.get('qb_realm_id')?.value;

    if (!realmId) {
      console.error("🚨 Nedostaje realmId u zahtevu! Nije moguće diskonektovati nalog.");
      return NextResponse.json({ error: "Missing realmId. Cannot disconnect." }, { status: 400 });
    }

    const { data: connection } = await supabase
      .from('qb_connections')
      .select('refresh_token')
      .eq('realm_id', realmId)
      .single();

    const refreshToken = connection?.refresh_token;

    if (refreshToken) {
      // Hvata ID i Secret, bilo da si ih nazvao QB_ ili QUICKBOOKS_ u Vercel postavkama
      const clientId = process.env.QUICKBOOKS_CLIENT_ID || process.env.QB_CLIENT_ID;
      const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || process.env.QB_CLIENT_SECRET;
      
      const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const revokeResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!revokeResponse.ok) {
        console.error("❌ QuickBooks Revoke API error:", await revokeResponse.text());
      } else {
        console.log("✅ QuickBooks token successfully revoked for realmId:", realmId);
      }
    }

    const { error: deleteError } = await supabase
      .from('qb_connections')
      .delete()
      .eq('realm_id', realmId);

    if (deleteError) {
      console.error("❌ Supabase greška pri brisanju konekcije:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Greška u disconnect ruti:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
