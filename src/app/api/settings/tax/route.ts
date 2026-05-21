export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const realmId = "9341457104211536";
    const { data } = await supabase
      .from('qb_connections')
      .select('apply_tax')
      .eq('realm_id', realmId)
      .single();

    return NextResponse.json({ applyTax: data?.apply_tax !== false });
  } catch (error) {
    return NextResponse.json({ applyTax: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const realmId = "9341457104211536";
    
    await supabase
      .from('qb_connections')
      .update({ apply_tax: body.applyTax })
      .eq('realm_id', realmId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
