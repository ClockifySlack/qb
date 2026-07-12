export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    // 1. Pokušavamo da izvučemo realmId iz JSON body-ja (ako ga frontend šalje)
    // 2. Ako ga nema u body-ju, pokušavamo da ga izvučemo iz HTTP kolačića (gde se obično čuva nakon OAuth logina)
    const realmId = body.realmId 
      || request.cookies.get('realmId')?.value 
      || request.cookies.get('qb_realm_id')?.value;

    if (!realmId) {
      console.error("🚨 Nedostaje realmId! Nije moguće povezati Clockify token sa QuickBooks nalogom.");
      return NextResponse.json({ error: "Missing realmId. Cannot link token." }, { status: 400 });
    }

    if (token) {
      const { error } = await supabase
        .from('qb_connections')
        .update({ clockify_token: token })
        .eq('realm_id', realmId);

      if (error) {
        console.error("❌ Supabase greška pri ažuriranju tokena:", error);
        throw error;
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🚨 Greška u save-token ruti:", error.message || error);
    return NextResponse.json({ error: "Greška pri čuvanju tokena" }, { status: 500 });
  }
}
