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

    const invoiceStatus = dataObj.status;
    if (invoiceStatus === 'SENT') {
      return NextResponse.json(
        { message: "Already synced! This invoice is already marked as SENT." },
        { status: 400, headers: corsHeaders }
      );
    }

    const invoiceId = dataObj.id;
    const invoiceNumber = dataObj.number || "INV-ACTION";
    
    if (!invoiceId) throw new Error("Invoice ID not recognized in payload");

    // ====================================================================
    // 1. EKSTRAKCIJA I DEKODIRANJE TOKENA ZA WORKSPACE ID
    // ====================================================================
    let clockifyToken = request.headers.get('clockify-signature') || request.headers.get('x-addon-token');
    
    if (!clockifyToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        clockifyToken = authHeader.toLowerCase().startsWith('bearer ') 
          ? authHeader.substring(7).trim() 
          : authHeader.trim();
      }
    }

    if (!clockifyToken) {
      throw new Error("Missing Clockify token in request headers.");
    }

    let workspaceId = dataObj.workspaceId;
    let baseUrl = 'https://api.clockify.me/api';
    
    if (clockifyToken.includes('.')) {
        try {
            const payloadBase64 = clockifyToken.split('.')[1];
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
            workspaceId = payload.workspaceId || payload.workspace_id || workspaceId;
            baseUrl = payload.backendUrl || baseUrl;
        } catch (e) {
            console.error("Greška pri dekodiranju JWT-a:", e);
        }
    }

    if (!workspaceId) {
        throw new Error("Ne mogu da izvučem workspaceId iz payload-a.");
    }

    // ====================================================================
    // 2. PREUZIMANJE CELE FAKTURE IZ CLOCKIFY-JA
    // ====================================================================
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const fetchInvoiceUrl = `${cleanBaseUrl.replace(/\/api$/, '')}/api/v1/workspaces/${workspaceId}/invoices/${invoiceId}`;
    
    let fullInvoiceData = dataObj;
    try {
        const invRes = await fetch(fetchInvoiceUrl, {
            headers: {
                'X-Addon-Token': clockifyToken,
                'Accept': 'application/json'
            }
        });
        
        if (invRes.ok) {
            fullInvoiceData = await invRes.json();
        } else {
            console.warn("⚠️ Nisam uspeo da povučem punu fakturu, oslanjam se na podatke iz webhooka.");
        }
    } catch (e) {
        console.error("Greška pri povlačenju pune fakture:", e);
    }

    // ====================================================================
    // 3. DIREKTNO SPAJANJE SA QUICKBOOKS NALOGOM
    // ====================================================================
    const { data: connectionRecord, error: connectionError } = await supabase
      .from('qb_connections')
      .select('realm_id')
      .eq('clockify_token', workspaceId)
      .single();

    if (connectionError || !connectionRecord?.realm_id) {
      throw new Error(`QuickBooks is not connected za workspace: ${workspaceId}.`);
    }

    const realmId = connectionRecord.realm_id;

    // ====================================================================
    // 4. PROVERA DUPLIKATA
    // ====================================================================
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
    const clientName = fullInvoiceData.clientName || dataObj.clientName || "Unknown Client";
    let qbCustomerId = "1";

    if (clientName !== "Unknown Client") {
      const safeClientName = clientName.replace(/'/g, "''");
      const queryUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(`select * from Customer where DisplayName = '${safeClientName}'`)}&minorversion=65`;
      
      const queryRes = await fetch(queryUrl, {
        headers: { 'Authorization': `Bearer ${qbAccessToken}`, 'Accept': 'application/json' }
      });
      
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (queryData.QueryResponse && queryData.QueryResponse.Customer && queryData.QueryResponse.Customer.length > 0) {
          qbCustomerId = queryData.QueryResponse.Customer[0].Id;
        } else {
          const createRes = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/customer?minorversion=65`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${qbAccessToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
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

    const txnDate = formatDate(fullInvoiceData.issueDate || dataObj.issuedDate);
    const dueDate = formatDate(fullInvoiceData.dueDate || dataObj.dueDate);

    const { data: connectionData } = await supabase
      .from('qb_connections')
      .select('apply_tax, mark_as_sent')
      .eq('realm_id', realmId)
      .single();

    const shouldApplyTax = connectionData?.apply_tax !== false;
    const shouldMarkAsSent = connectionData?.mark_as_sent !== false;

    // ====================================================================
    // 5. STROGO MAPIRANJE STAVKI (LINE ITEMS) SA ZAOKRUŽIVANJEM
    // ====================================================================
    const rawItems = fullInvoiceData.items || dataObj.items || [];
    let qbLines = [];

    if (rawItems.length > 0) {
      qbLines = rawItems.map((item: any) => {
        let unitPrice = item.unitPrice != null ? (Number(item.unitPrice) / 100) : 0;
        let clockifyAmount = item.amount != null ? (Number(item.amount) / 100) : 0;
        
        let qty = 1;

        // OBRNUTA MATEMATIKA: 
        // Pošto Clockify API nekad množi quantity sa 100, mi ga ne uzimamo iz objekta.
        // Računamo ga strogo koristeći cenu i iznos, koji uvek stižu ispravno.
        if (unitPrice > 0 && clockifyAmount > 0) {
            qty = clockifyAmount / unitPrice;
        } else if (unitPrice === 0 && clockifyAmount > 0) {
            qty = 1;
            unitPrice = clockifyAmount;
        } else if (clockifyAmount === 0) {
            // Samo ako je iznos 0 vraćamo se na Clockify-jev quantity
            qty = item.quantity != null ? Number(item.quantity) : 1;
            if (qty >= 100 && qty % 100 === 0) {
                qty = qty / 100;
            }
        }

        qty = Number(qty.toFixed(4));
        unitPrice = Number(unitPrice.toFixed(4));
        const lineAmount = Number((qty * unitPrice).toFixed(2));

        let description = item.description || item.notes || item.name || "Service";
        if (typeof description !== 'string' || description.trim() === '') {
          description = "Service";
        }

        return {
          "Amount": lineAmount,
          "Description": description.substring(0, 4000),
          "DetailType": "SalesItemLineDetail",
          "SalesItemLineDetail": {
            "ItemRef": { "value": "1", "name": "Services" },
            "TaxCodeRef": { "value": shouldApplyTax ? "TAX" : "NON" },
            "UnitPrice": unitPrice,
            "Qty": qty
          }
        };
      });
    } else {
      const amountInCents = fullInvoiceData.amount || fullInvoiceData.total || dataObj.amount || 0;
      const amountInDollars = Number((amountInCents / 100).toFixed(2));
      
      qbLines = [{
        "Amount": amountInDollars >= 0 ? amountInDollars : 0,
        "Description": "Services",
        "DetailType": "SalesItemLineDetail",
        "SalesItemLineDetail": {
            "ItemRef": { "value": "1", "name": "Services" },
            "TaxCodeRef": { "value": shouldApplyTax ? "TAX" : "NON" }
        }
      }];
    }

    const qbInvoiceBody: any = {
      "Line": qbLines,
      "CustomerRef": { "value": qbCustomerId },
      "DocNumber": invoiceNumber
    };

    if (txnDate) qbInvoiceBody.TxnDate = txnDate;
    if (dueDate) qbInvoiceBody.DueDate = dueDate;

    if (fullInvoiceData.note && typeof fullInvoiceData.note === 'string' && fullInvoiceData.note.trim() !== '') {
      qbInvoiceBody.CustomerMemo = { "value": fullInvoiceData.note.substring(0, 1000) };
    }

    const qbResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice?minorversion=65`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${qbAccessToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(qbInvoiceBody)
    });

    if (!qbResponse.ok) {
        const errorText = await qbResponse.text();
        console.error("🚨 SIROVI QUICKBOOKS ODGOVOR:", errorText); 
        
        let errMsg = "QuickBooks API rejected the request.";
        try {
            const parsed = JSON.parse(errorText);
            if (parsed.Fault && parsed.Fault.Error && parsed.Fault.Error.length > 0) {
                errMsg = `QuickBooks Error: ${parsed.Fault.Error[0].Detail || parsed.Fault.Error[0].Message}`;
            }
        } catch(e) {}
        
        throw new Error(errMsg);
    }

    const qbResult = await qbResponse.json();

    await supabase
      .from('synced_invoices')
      .insert({ clockify_invoice_id: invoiceId, qb_invoice_id: qbResult.Invoice.Id });

    // ====================================================================
    // 6. CLOCKIFY STATUS UPDATE
    // ====================================================================
    if (shouldMarkAsSent) {
      try {
        const patchApiUrl = `${cleanBaseUrl.replace(/\/api$/, '')}/api/v1/workspaces/${workspaceId}/invoices/${invoiceId}/status`;
        const patchPayload = { invoiceStatus: "SENT" };

        await fetch(patchApiUrl, {
          method: 'PATCH',
          headers: {
            'X-Addon-Token': clockifyToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(patchPayload)
        });
      } catch (error: any) {
        console.error("CATCH ERROR UNUTAR PATCH:", error.message);
      }
    }

    return NextResponse.json({
      message: `Invoice for client ${clientName} successfully synced!`,
      type: "SUCCESS"
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("🚨 GLAVNA GREŠKA U SINHRONIZACIJI:", error.message || error);
    
    return NextResponse.json({ 
      message: error.message || "An error occurred",
      type: "ERROR" 
    }, { status: 200, headers: corsHeaders });
  }
}
