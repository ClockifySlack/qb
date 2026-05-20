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

    let dataObj = body;
    if (!dataObj.id) {
       const nestedObject: any = Object.values(body).find(
         (val: any) => val && typeof val === 'object' && val.id
       );
       if (nestedObject) {
          dataObj = nestedObject;
       }
    }

    const invoiceId = dataObj.id;
    const invoiceNumber = dataObj.number || "INV-ACTION";
    
    const amountInCents = dataObj.total || dataObj.amount || dataObj.balance || 0;
    const amountInDollars = amountInCents / 100;
    
    const realmId = "9341457104211536";

    if (!invoiceId) {
      throw new Error("Nije prepoznat ID fakture u payload-u");
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
    
    const clientName = dataObj.clientName || "Nepoznat Klijent";
    let qbCustomerId = "1";

    if (clientName !== "Nepoznat Klijent") {
      const safeClientName = clientName.replace(/'/g, "''");
      const query = `select * from Customer where DisplayName = '${safeClientName}'`;
      const queryUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;
      
      const queryRes = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${qbAccessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (queryData.QueryResponse && queryData.QueryResponse.Customer && queryData.QueryResponse.Customer.length > 0) {
          qbCustomerId = queryData.QueryResponse.Customer[0].Id;
        } else {
          const createCustomerUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/customer?minorversion=65`;
          const createRes = await fetch(createCustomerUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${qbAccessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ DisplayName: clientName })
          });
          
          if (createRes.ok) {
            const createData = await createRes.json();
            qbCustomerId = createData.Customer.Id;
          }
        }
      }
    }

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return undefined;
      return dateStr.split('T')[0];
    };

    const txnDate = formatDate(dataObj.issuedDate || dataObj.issueDate);
    const dueDate = formatDate(dataObj.dueDate);

    const qbInvoiceBody: any = {
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
        "value": qbCustomerId
      },
      "DocNumber": invoiceNumber
    };

    if (txnDate) qbInvoiceBody.TxnDate = txnDate;
    if (dueDate) qbInvoiceBody.DueDate = dueDate;

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
      throw new Error("QuickBooks API je odbio zahtev za kreiranje fakture");
    }

    const qbResult = await qbResponse.json();

    await supabase
      .from('synced_invoices')
      .insert({
        clockify_invoice_id: invoiceId,
        qb_invoice_id: qbResult.Invoice.Id
      });

    return NextResponse.json({
      message: `Faktura za klijenta ${clientName} uspešno sinhronizovana!`,
      type: "SUCCESS"
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Action error:', error);
    return NextResponse.json({ 
      message: error.message || "Došlo je do greške",
      type: "ERROR" 
    }, { 
      status: 200, 
      headers: corsHeaders 
    });
  }
}
