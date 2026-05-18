export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');

  if (!code || !realmId) {
    return NextResponse.redirect(new URL('/dashboard?status=error&message=Missing_code_or_realmId', request.url));
  }

  try {
    // Probni tokeni za ovaj korak testiranja
    const dummyAccessToken = "mock_access_" + Math.random().toString(36).substring(7);
    const dummyRefreshToken = "mock_refresh_" + Math.random().toString(36).substring(7);

    // .upsert() pametno rešava problem: ako realm_id postoji, ažurira ga. Ako ne postoji, ubacuje novi.
    const { data, error: dbError } = await supabase
      .from('qb_connections')
      .upsert(
        {
          realm_id: realmId,
          access_token: dummyAccessToken,
          refresh_token: dummyRefreshToken,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
        },
        { onConflict: 'realm_id' } // Kažemo bazi da konflikt gleda po ovom polju
      );

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return NextResponse.redirect(
        new URL(`/dashboard?status=error&message=${encodeURIComponent(dbError.message)}`, request.url)
      );
    }

    return NextResponse.redirect(new URL('/dashboard?status=success', request.url));
  } catch (error: any) {
    console.error('OAuth Callback Catch Error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard?status=error&message=${encodeURIComponent(error.message || 'unknown')}`, request.url)
    );
  }
}
