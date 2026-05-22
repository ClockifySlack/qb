export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-addon-token, clockify-signature, x-workspace-id, Accept',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Agresivno hvatanje tokena
    let clockifyToken = request.headers.get('x-addon-token') || request.headers.get('clockify-signature');
    if (!clockifyToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        clockifyToken = authHeader.substring(7);
      }
    }

    if (!clockifyToken) {
      return NextResponse.json({ 
        message: "TEST PAO: Nijedan token nije stigao u zaglavljima requesta.", 
        type: "ERROR" 
      }, { status: 200, headers: corsHeaders });
    }

    // 2. Dekodiranje tokena da izvučemo workspaceId i URL
    const payloadBase64 = clockifyToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    
    const workspaceId = payload.workspaceId || payload.workspace_id || "9341457104211536";
    const baseUrl = payload.backendUrl || 'https://api.clockify.me/api';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const apiUrl = `${cleanBaseUrl.replace(/\/api$/, '')}/api/v1/workspaces/${workspaceId}`;

    // 3. PROSTI API POZIV (GET Workspace)
    const testRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Addon-Token': clockifyToken,
        'Accept': 'application/json'
      }
    });

    const testStatus = testRes.status;
    const testText = await testRes.text();

    // 4. Ispisujemo rezultat direktno na tvoj ekran u Clockify-ju
    if (testRes.ok) {
      return NextResponse.json({ 
        message: `TEST USPEŠAN! Status: ${testStatus}. Token radi za API pozive!`, 
        type: "SUCCESS" 
      }, { status: 200, headers: corsHeaders });
    } else {
      return NextResponse.json({ 
        message: `TEST PAO (Status ${testStatus}): ${testText.substring(0, 150)}`, 
        type: "ERROR" 
      }, { status: 200, headers: corsHeaders });
    }

  } catch (error: any) {
    return NextResponse.json({ 
      message: `Greška u kodu skripte: ${error.message}`, 
      type: "ERROR" 
    }, { status: 200, headers: corsHeaders });
  }
}
