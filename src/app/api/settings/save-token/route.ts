export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const realmId = "9341457104211536";

    if (token) {
      await supabase
        .from('qb_connections')
        .update({ clockify_token: token })
        .eq('realm_id', realmId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Greška pri čuvanju tokena" }, { status: 500 });
  }
}
