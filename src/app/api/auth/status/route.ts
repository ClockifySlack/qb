export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authToken = searchParams.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ isConnected: false });
    }

    // Dekodiramo JWT da dobijemo tačan workspaceId
    let workspaceId = '';
    if (authToken.includes('.')) {
      try {
        const payloadBase64 = authToken.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        workspaceId = payload.workspaceId || payload.workspace_id;
      } catch (e) {
        console.error("Greška pri dekodiranju JWT tokena u status ruti:", e);
      }
    }

    // Fallback ako ne uspedne dekodiranje
    if (!workspaceId) {
      workspaceId = authToken;
    }

    // Tražimo konekciju u bazi koristeći dinamički workspaceId
    const { data, error } = await supabase
      .from('qb_connections')
      .select('realm_id')
      .eq('clockify_token', workspaceId) // Ovde čuvamo workspaceId
      .single();

    if (data && data.realm_id) {
      return NextResponse.json({ isConnected: true });
    }
    
    return NextResponse.json({ isConnected: false });
  } catch (error) {
    return NextResponse.json({ isConnected: false });
  }
}
