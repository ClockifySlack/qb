export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-addon-token, x-workspace-id, Accept',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("=== CLOCKIFY INVOICE ACTION PAYLOAD ===", JSON.stringify(body, null, 2));

    return NextResponse.json({
      message: "Action received! Please open QuickBooks Bridge from the sidebar to sync.",
      type: "SUCCESS" 
    }, {
      status: 200,
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Action error:', error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}
