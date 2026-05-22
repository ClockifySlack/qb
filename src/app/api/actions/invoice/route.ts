export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getValidQBTokens } from '../../../../lib/qbAuth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// KLJUČNA ISPRAVKA: Dodat 'clockify-signature' u dozvoljene CORS headere
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
      throw new Error("Invoice ID not recognized in payload");
    }

    const { data: existingSync } = await supabase
      .from('synced_invoices')
      .select('*')
      .eq('clockify_invoice_id', invoiceId)
      .single();

    if (existingSync) {
      return NextResponse.json({
        message: "This invoice has already been sent to QuickBooks!",
        type: "ERROR" 
      }, { status: 200, headers: corsHeaders });
    }

    const qbAccessToken = await getValidQBTokens(realmId);
    
    const clientName = dataObj.clientName || "Unknown Client";
    let qbCustomerId = "1";

    if (clientName !== "Unknown Client") {
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

    const { data: connectionData } = await supabase
      .from('qb_connections')
      .select('apply_tax, mark_as_sent')
      .eq('realm_id', realmId)
      .single();

    const shouldApplyTax = connectionData?.apply_tax !== false;
    const shouldMarkAsSent = connectionData?.mark_as_sent !== false;

    const salesItemLineDetail: any = {
      "ItemRef": {
        "value": "1", 
        "name": "Services"
      }
    };

    if (shouldApplyTax) {
      salesItemLineDetail["TaxCodeRef"] = { "value": "TAX" };
    } else {
      salesItemLineDetail["TaxCodeRef"] = { "value": "NON" };
    }

    const qbInvoiceBody: any = {
      "Line": [
        {
          "Amount": amountInDollars >= 0 ? amountInDollars : 0,
          "DetailType": "SalesItemLineDetail",
          "SalesItemLineDetail": salesItemLineDetail
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
      throw new Error("QuickBooks API rejected the request to create the invoice");
    }

    const qbResult = await qbResponse.json();

    await supabase
      .from('synced_invoices')
      .insert({
        clockify_invoice_id: invoiceId,
        qb_invoice_id: qbResult.Invoice.Id
      });

    // PROMENA STATUSA U CLOCKIFY-JU
    if (shouldMarkAsSent) {
      // Sada skupljamo token iz SVIH mogućih mesta koje Clockify može da koristi
      let addonToken = request.headers.get('clockify-signature') || 
                       request.headers.get('x-addon-token') || 
                       request.headers.get('X-Addon-Token');

      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (!addonToken && authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        addonToken = authHeader.substring(7);
      }

      if (addonToken) {
        try {
          const payloadBase64 = addonToken.split('.')[1];
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          const workspaceId = payload.workspaceId || payload.workspace_id;
          const baseUrl = payload.backendUrl || 'https://api.clockify.me/api';
          const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          
          const getInvRes = await fetch(`${cleanBaseUrl.replace(/\/api$/, '')}/api/v1/workspaces/${workspaceId}/invoices/${invoiceId}`, {
            headers: {
              'X-Addon-Token': addonToken,
              'Accept': 'application/json'
            }
          });

          if (getInvRes.ok) {
            const clockifyInvoiceData = await getInvRes.json();
            
            const updatePayload = {
              clientId: clockifyInvoiceData.clientId,
              currency: clockifyInvoiceData.currency,
              dueDate: clockifyInvoiceData.dueDate,
              issueDate: clockifyInvoiceData.issueDate || clockifyInvoiceData.issuedDate,
              notes: clockifyInvoiceData.notes || "",
              number: clockifyInvoiceData.number,
              paymentTerms: clockifyInvoiceData.paymentTerms || 0,
              status: "SENT",
              subject: clockifyInvoiceData.subject || "",
              items: clockifyInvoiceData.items || [] 
            };

            await fetch(`${cleanBaseUrl.replace(/\/api$/, '')}/api/v1/workspaces/${workspaceId}/invoices/${invoiceId}`, {
              method: 'PUT',
              headers: {
                'X-Addon-Token': addonToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(updatePayload)
            });
          }
        } catch (error) {
        }
      }
    }

    return NextResponse.json({
      message: `Invoice for client ${clientName} successfully synced!`,
      type: "SUCCESS"
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json({ 
      message: error.message || "An error occurred",
      type: "ERROR" 
    }, { 
      status: 200, 
      headers: corsHeaders 
    });
  }
}
