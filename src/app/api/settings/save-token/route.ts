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
    
    const realmId = body.realmId 
      || request.cookies.get('realmId')?.value 
      || request.cookies.get('qb_realm_id')?.value;

    if (!realmId) {
      console.error("🚨 Nedostaje realmId! Nije moguće povezati nalog.");
      return NextResponse.json({ error: "Missing realmId. Cannot link token." }, { status: 400 });
    }

    if (token) {
      // 1. Dekodiramo token kako bismo izvukli jedinstveni workspaceId
      let workspaceId = token; 
      if (token.includes('.')) {
          try {
              const payloadBase64 = token.split('.')[1];
              const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
              workspaceId = payload.workspaceId || payload.workspace_id || token;
          } catch (e) {
              console.error("Greška pri dekodiranju JWT-a u save-token:", e);
          }
      }

      // 2. Čuvamo workspaceId direktno u kolonu clockify_token
      const { error } = await supabase
        .from('qb_connections')
        .update({ clockify_token: workspaceId })
        .eq('realm_id', realmId);

      if (error) {
        console.error("❌ Supabase greška pri upisu workspaceId-ja:", error);
        throw error;
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🚨 Greška u save-token ruti:", error.message || error);
    return NextResponse.json({ error: "Greška pri čuvanju tokena" }, { status: 500 });
  }
}
