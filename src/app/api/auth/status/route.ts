export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const testRealmId = "9341457104211536";

    const { data, error } = await supabase
      .from('qb_connections')
      .select('realm_id')
      .eq('realm_id', testRealmId)
      .single();

    if (data) {
      return NextResponse.json({ isConnected: true });
    }
    
    return NextResponse.json({ isConnected: false });
  } catch (error) {
    return NextResponse.json({ isConnected: false });
  }
}
