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
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId');

    if (!code || !realmId) {
      console.error("DEBUG CALLBACK: Fali code ili realmId u URL-u.");
      return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
    }

    const authString = Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.QB_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("DEBUG CALLBACK: Intuit API je odbio kod! Razlog:", errText);
      return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
    }

    const tokenData = await tokenResponse.json();

    const { error: dbError } = await supabase
      .from('qb_connections')
      .upsert({
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        apply_tax: true,
        mark_as_sent: true
      }, { onConflict: 'realm_id' });

    if (dbError) {
      console.error("DEBUG CALLBACK: Supabase upisivanje puklo:", dbError);
      return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
    }

    return NextResponse.redirect(new URL('/dashboard?status=success', request.url));

  } catch (error: any) {
    console.error("DEBUG CALLBACK: Uhvaćen kritičan error:", error.message);
    return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
  }
}
