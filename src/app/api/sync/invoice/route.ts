export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getValidQBTokens } from '../../../../lib/qbAuth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, invoiceNumber, amount, realmId } = body;

    if (!realmId || !invoiceId) {
      return NextResponse.json({ error: 'Nedostaju parametri' }, { status: 400 });
    }

    const { data: existingSync } = await supabase
      .from('synced_invoices')
      .select('*')
      .eq('clockify_invoice_id', invoiceId)
      .single();

    if (existingSync) {
      return NextResponse.json({ error: 'Faktura je već sinhronizovana' }, { status: 400 });
    }

    const qbAccessToken = await getValidQBTokens(realmId);

    const qbInvoiceBody = {
      "Line": [
        {
"Amount": amount >= 0 ? amount : 0,
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
        "value": "1" // Ovde je tvoja Amy!
      },
      "DocNumber": invoiceNumber || "INV-001"
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
      return NextResponse.json({ error: 'QuickBooks API odbio kreiranje fakture' }, { status: 500 });
    }

    const qbResult = await qbResponse.json();

    await supabase
      .from('synced_invoices')
      .insert({
        clockify_invoice_id: invoiceId,
        qb_invoice_id: qbResult.Invoice.Id
      });

    return NextResponse.json({ 
      success: true, 
      qbInvoiceId: qbResult.Invoice.Id 
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
