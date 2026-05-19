export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})); // Hvatamo ako je body prazan
    
    // Clockify šalje podatke u headerima (x-addon-token i x-workspace-id), 
    // ali za svaki slučaj proveravamo i body strukturu
    const workspaceId = request.headers.get('x-workspace-id') || body?.workspaceId || body?.context?.workspaceId;
    const addonToken = request.headers.get('x-addon-token') || body?.token || body?.addonToken;

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
      
      console.log(`Uspešno upisan token za workspace: ${workspaceId}`);
    } else {
      console.warn(`Instalacija pukla! WorkspaceID: ${workspaceId}, Token: ${addonToken ? 'Pronađen' : 'Nedostaje'}`);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Install webhook error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
