export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { workspaceId, addonToken } = body;

    if (workspaceId && addonToken) {
      const { error } = await supabase
        .from('clockify_tokens')
        .upsert({
          workspace_id: workspaceId,
          addon_token: addonToken
        }, { onConflict: 'workspace_id' });

      if (error) {
        console.error('Greška pri upisu tokena u bazu:', error);
        return new NextResponse('Database Error', { status: 500 });
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Install webhook error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
