import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');

  if (!code || !realmId) {
    return NextResponse.json({ error: 'Nedostaju autorizacioni parametri.' }, { status: 400 });
  }

  try {
    const clientId = process.env.QB_CLIENT_ID;
    const clientSecret = process.env.QB_CLIENT_SECRET;
    const redirectUri = process.env.QB_REDIRECT_URI;

    const credentials = btoa(`${clientId}:${clientSecret}`);
    
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri!,
      }),
    });

    const tokenData = await response.json();

    if (!response.ok) {
      throw new Error(tokenData.error_description || 'Greška pri preuzimanju tokena');
    }


    return NextResponse.redirect(new URL('/dashboard?status=success', request.url));

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
