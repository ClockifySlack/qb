import { NextRequest, NextResponse } from 'next/server';
import { getValidQBTokens } from '../../../../lib/qbAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, invoiceNumber, amount, realmId } = body;

    if (!realmId) {
      return NextResponse.json({ error: 'Missing realmId parameter' }, { status: 400 });
    }

    // 1. Dobijanje važećeg tokena (automatski osvežava ako je prošlo sat vremena)
    const qbAccessToken = await getValidQBTokens(realmId);

    // 2. Priprema QuickBooks Invoice strukture (Zahteva bar 1 Line Item i CustomerRef)
    const qbInvoiceBody = {
      "Line": [
        {
          "Amount": amount || 1980.00,
          "DetailType": "SalesItemLineDetail",
          "SalesItemLineDetail": {
            "ItemRef": {
              "value": "1", // Podrazumevana usluga u QB Sandbox-u
              "name": "Services"
            }
          }
        }
      ],
      "CustomerRef": {
        "value": "1" // Podrazumevani kupac u QB Sandbox-u (Amy's Bird Sanctuary)
      },
      "DocNumber": invoiceNumber || "INV-001"
    };

    // 3. Slanje na QuickBooks produkcijski/sandbox API
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

    return NextResponse.json({ 
      success: true, 
      qbInvoiceId: qbResult.Invoice.Id 
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
