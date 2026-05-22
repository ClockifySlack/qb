export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const realmId = "9341457104211536"; // Zakucan za MVP

    const { data: connection } = await supabase
      .from('qb_connections')
      .select('refresh_token')
      .eq('realm_id', realmId)
      .single();

    const refreshToken = connection?.refresh_token;

    if (refreshToken) {
      const authString = Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64');
      
      const revokeResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!revokeResponse.ok) {
        console.error("QuickBooks Revoke API error:", await revokeResponse.text());
      }
    }

    await supabase
      .from('qb_connections')
      .delete()
      .eq('realm_id', realmId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
