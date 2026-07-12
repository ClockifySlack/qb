export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. Pokušavamo da izvučemo realmId iz URL parametara (ako ga frontend šalje tako)
    // 2. Ako ga nema u URL-u, tražimo ga u kolačićima
    const urlRealmId = request.nextUrl.searchParams.get('realmId');
    const realmId = urlRealmId 
      || request.cookies.get('realmId')?.value 
      || request.cookies.get('qb_realm_id')?.value;

    if (!realmId) {
      console.warn("⚠️ Upozorenje: Nedostaje realmId u GET zahtevu. Vraćam podrazumevane vrednosti.");
      return NextResponse.json({ applyTax: true, markAsSent: true });
    }

    const { data, error } = await supabase
      .from('qb_connections')
      .select('apply_tax, mark_as_sent')
      .eq('realm_id', realmId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 je kod kada ne nađe nijedan red
      console.error("❌ Supabase greška pri čitanju preferenci:", error);
    }

    return NextResponse.json({ 
      applyTax: data?.apply_tax !== false,
      markAsSent: data?.mark_as_sent !== false 
    });
  } catch (error: any) {
    console.error("🚨 Greška u GET preferences ruti:", error.message || error);
    return NextResponse.json({ applyTax: true, markAsSent: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Slično kao u save-token: tražimo u body-ju, a zatim u kolačićima
    const realmId = body.realmId 
      || request.cookies.get('realmId')?.value 
      || request.cookies.get('qb_realm_id')?.value;
    
    if (!realmId) {
      console.error("🚨 Nedostaje realmId u POST zahtevu! Nije moguće sačuvati preference.");
      return NextResponse.json({ error: "Missing realmId. Cannot update preferences." }, { status: 400 });
    }

    const updateData: any = {};
    if (body.applyTax !== undefined) updateData.apply_tax = body.applyTax;
    if (body.markAsSent !== undefined) updateData.mark_as_sent = body.markAsSent;

    const { error } = await supabase
      .from('qb_connections')
      .update(updateData)
      .eq('realm_id', realmId);

    if (error) {
      console.error("❌ Supabase greška pri ažuriranju preferenci:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Greška u POST preferences ruti:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
