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
    const authToken = body.auth_token;

    if (!authToken) {
      return NextResponse.json({ error: "Nedostaje auth_token u zahtevu! Nije moguće diskonektovati nalog." }, { status: 400 });
    }

    // Dekodiranje JWT tokena da dobijemo tačan workspaceId
    let workspaceId = '';
    if (authToken.includes('.')) {
      try {
        const payloadBase64 = authToken.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        workspaceId = payload.workspaceId || payload.workspace_id;
      } catch (e) {
        console.error("Greška pri dekodiranju tokena:", e);
      }
    }

    // Fallback
    if (!workspaceId) {
      workspaceId = authToken;
    }

    // Brišemo tačnu konekciju iz baze
    const { error } = await supabase
      .from('qb_connections')
      .delete()
      .eq('clockify_token', workspaceId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Greška u API-ju za diskonektovanje:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
