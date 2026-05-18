export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');

  if (!code || !realmId) {
    return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
  }

  try {
    const clientId = process.env.QB_CLIENT_ID;
    const clientSecret = process.env.QB_CLIENT_SECRET;
    const redirectUri = process.env.QB_REDIRECT_URI;
    const credentials = btoa(`${clientId}:${clientSecret}`);

    // Razmena autorizacionog koda za prave QuickBooks tokene
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri!,
      }),
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
    }

    const tokens = await response.json();

    const { error: dbError } = await supabase
      .from('qb_connections')
      .upsert(
        {
          realm_id: realmId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        },
        { onConflict: 'realm_id' }
      );

    if (dbError) {
      return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
    }

    return NextResponse.redirect(new URL('/dashboard?status=success', request.url));
  } catch (error) {
    return NextResponse.redirect(new URL('/dashboard?status=error', request.url));
  }
}
