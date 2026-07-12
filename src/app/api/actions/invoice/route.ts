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

    // Provera da li je faktura već poslata, kako bismo okinuli Toast notifikaciju u Clockify-ju.
    const invoiceStatus = dataObj.status;
    if (invoiceStatus === 'SENT') {
      return NextResponse.json(
        { message: "Already synced! This invoice is already marked as SENT." },
        { status: 400, headers: corsHeaders }
      );
    }

    const invoiceId = dataObj.id;
    const invoiceNumber = dataObj.number || "INV-ACTION";
    const amountInCents = dataObj.total || dataObj.amount || dataObj.balance || 0;
    const amountInDollars = amountInCents / 100;
    
    // 🚨 PAŽNJA: OVO MORA DA BUDE DINAMIČNO ZA PRODUKCIJU! 🚨
    // Ne sme ostati hardkodovano, inače će Intuit odbiti zahtev jer ovaj Realm ID ne postoji na produkciji.
    // Trebalo bi da ga vučeš iz baze na osnovu Clockify Workspace ID-a.
    const realmId = "9341457104211536"; 

    if (!invoiceId) throw new Error("Invoice ID not recognized in payload");

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
      // PROMENJENO: URL sada gađa produkcioni Intuit API
      const queryUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(`select * from Customer where DisplayName = '${safeClientName}'`)}&minorversion=65`;
      
      const queryRes = await fetch(queryUrl, {
        headers: { 'Authorization': `Bearer ${qbAccessToken}`, 'Accept': 'application/json' }
      });
      
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (queryData.QueryResponse && queryData.QueryResponse.Customer && queryData.QueryResponse.Customer.length > 0) {
          qbCustomerId = queryData.QueryResponse.Customer[0].Id;
        } else {
          // PROMENJENO: URL sada gađa produkcioni Intuit API
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

    const txnDate = formatDate(dataObj.issuedDate || dataObj.issueDate);
    const dueDate = formatDate(dataObj.dueDate);

    const { data: connectionData } = await supabase
      .from('qb_connections')
      .select('apply_tax, mark_as_sent')
      .eq('realm_id', realmId)
      .single();

    const shouldApplyTax = connectionData?.apply_tax !== false;
    const shouldMarkAsSent = connectionData?.mark_as_sent !== false;

    const salesItemLineDetail: any = { "ItemRef": { "value": "1", "name": "Services" } };
    salesItemLineDetail["TaxCodeRef"] = { "value": shouldApplyTax ? "TAX" : "NON" };

    const qbInvoiceBody: any = {
      "Line": [{
        "Amount": amountInDollars >= 0 ? amountInDollars : 0,
        "DetailType": "SalesItemLineDetail",
        "SalesItemLineDetail": salesItemLineDetail
      }],
      "CustomerRef": { "value": qbCustomerId },
      "DocNumber": invoiceNumber
    };

    if (txnDate) qbInvoiceBody.TxnDate = txnDate;
    if (dueDate) qbInvoiceBody.DueDate = dueDate;

    // PROMENJENO: URL sada gađa produkcioni Intuit API
    const qbResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice?minorversion=65`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${qbAccessToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(qbInvoiceBody)
    });

    if (!qbResponse.ok) {
        const errorText = await qbResponse.text();
        throw new Error(`QuickBooks API rejected the request: ${errorText}`);
    }

    const qbResult = await qbResponse.json();

    await supabase
      .from('synced_invoices')
      .insert({ clockify_invoice_id: invoiceId, qb_invoice_id: qbResult.Invoice.Id });

    // ====================================================================
    // CLOCKIFY STATUS UPDATE (PATCH METHOD)
    // ====================================================================
    if (shouldMarkAsSent) {
      console.log("=== POČETAK CLOCKIFY API POZIVA (PATCH) ===");

      let clockifyToken = request.headers.get('clockify-signature') || request.headers.get('x-addon-token');
      
      if (!clockifyToken) {
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
          clockifyToken = authHeader.toLowerCase().startsWith('bearer ') 
            ? authHeader.substring(7).trim() 
            : authHeader.trim();
        }
      }

      console.log("1. PRONAĐEN TOKEN:", clockifyToken ? "DA" : "NE");

      if (clockifyToken) {
        try {
          const payloadBase64 = clockifyToken.split('.')[1];
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          
          const workspaceId = payload.workspaceId || payload.workspace_id || dataObj.workspaceId;
          const baseUrl = payload.backendUrl || 'https://api.clockify.me/api';
          const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          
          const apiUrl = `${cleanBaseUrl.replace(/\/api$/, '')}/api/v1/workspaces/${workspaceId}/invoices/${invoiceId}/status`;
          
          console.log("2. GAĐAMO URL:", apiUrl);

          const patchPayload = {
            invoiceStatus: "SENT"
          };

          const patchRes = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
              'X-Addon-Token': clockifyToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(patchPayload)
          });

          console.log("3. PATCH STATUS:", patchRes.status);
          
          if (!patchRes.ok) {
              const patchErr = await patchRes.text();
              console.error("4. PATCH GREŠKA:", patchErr);
          } else {
              console.log("4. ✅ USPEH: Status fakture uspešno promenjen u SENT!");
          }
        } catch (error: any) {
          console.error("5. CATCH ERROR:", error.message);
        }
      } else {
          console.error("5. TOKEN NIJE PRONAĐEN U ZAGLAVLJU!");
      }
      console.log("=== KRAJ CLOCKIFY API POZIVA ===");
    }

    return NextResponse.json({
      message: `Invoice for client ${clientName} successfully synced!`,
      type: "SUCCESS"
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    // DODATO: Nateraj Vercel da ispiše tačnu grešku u logove!
    console.error("🚨 GLAVNA GREŠKA U SINHRONIZACIJI:", error);
    
    return NextResponse.json({ 
      message: error.message || "An error occurred",
      type: "ERROR" 
    }, { status: 200, headers: corsHeaders });
  }
}
