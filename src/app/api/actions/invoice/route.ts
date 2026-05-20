export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getValidQBTokens } from '../../../../lib/qbAuth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-addon-token, x-workspace-id, Accept',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("=== CLOCKIFY INVOICE ACTION PAYLOAD ===", JSON.stringify(body, null, 2));

    const invoiceId = body.id;
    const invoiceNumber = body.number || "INV-ACTION";
    const amountInCents = body.total || body.amount || 0;
    const amountInDollars = amountInCents / 100;
    
    const realmId = "9341457104211536";

    if (!invoiceId) {
      throw new Error("Nije prepoznat ID fakture");
    }

    const { data: existingSync } = await supabase
      .from('synced_invoices')
      .select('*')
      .eq('clockify_invoice_id', invoiceId)
      .single();

    if (existingSync) {
      return NextResponse.json({
        message: "Ova faktura je već poslata u QuickBooks!",
        type: "ERROR" 
      }, { status: 200, headers: corsHeaders });
    }

    const qbAccessToken = await getValidQBTokens(realmId);
    
    const qbInvoiceBody = {
      "Line": [
        {
          "Amount": amountInDollars > 0 ? amountInDollars : 1980.00,
          "DetailType": "SalesItemLineDetail",
          "SalesItemLineDetail": {
            "ItemRef": {
              "value": "1", 
              "name": "Services"
            }
          }
        }
      ],
      "CustomerRef": {
        "value": "1" 
      },
      "DocNumber": invoiceNumber
    };

    const qbResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice?minorversion=65`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qbAccessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(qbInvoiceBody)
    });

    if (!qbResponse.ok) {
      const errorData = await qbResponse.json();
      console.error('QuickBooks API Error:', errorData);
      throw new Error("QuickBooks API je odbio zahtev");
    }

    const qbResult = await qbResponse.json();

    await supabase
      .from('synced_invoices')
      .insert({
        clockify_invoice_id: invoiceId,
        qb_invoice_id: qbResult.Invoice.Id
      });

    return NextResponse.json({
      message: `Faktura ${invoiceNumber} uspešno sinhronizovana!`,
      type: "SUCCESS"
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Action error:', error);
    return NextResponse.json({ 
      message: error.message || "Došlo je do greške prilikom sinhronizacije",
      type: "ERROR" 
    }, { 
      status: 200,
      headers: corsHeaders 
    });
  }
}
