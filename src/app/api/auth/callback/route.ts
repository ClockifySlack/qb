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
    // 1. Ovde tvoj kod menja code za prave tokene preko QuickBooks API-ja
    // (Pretpostavljamo da ovaj deo prođe i vrati npr. lažne/probne tokene za test)
    const dummyAccessToken = "mock_access_" + Math.random().toString(36).substring(7);
    const dummyRefreshToken = "mock_refresh_" + Math.random().toString(36).substring(7);

    // 2. Upis u Supabase sa striktnom proverom greške
    const { data, error: dbError } = await supabase
      .from('qb_connections')
      .insert([
        {
          realm_id: realmId,
          access_token: dummyAccessToken,
          refresh_token: dummyRefreshToken,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
        }
      ]);

    // Ako je Supabase vratio grešku, preusmeri i ispiši je u URL-u
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
