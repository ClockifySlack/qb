import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('qb_connections').select('id').limit(1);

    return NextResponse.json({ success: true, message: "Supabase pinged successfully!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Ping failed" }, { status: 500 });
  }
}
