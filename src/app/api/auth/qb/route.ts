export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 1. Hvatamo workspaceId iz URL parametara
  const searchParams = request.nextUrl.searchParams;
  const urlWorkspaceId = searchParams.get('workspaceId');
  
  // 2. Fallback: Ako nije u URL-u, proveravamo kolačiće
  const cookieWorkspaceId = request.cookies.get('workspaceId')?.value;

  const workspaceId = urlWorkspaceId || cookieWorkspaceId;

  if (!workspaceId) {
    console.warn("⚠️ UPOZORENJE u qb ruti: workspaceId nije detektovan! Konekcija možda neće biti uspešna.");
  }

  // Preuzimamo varijable, podržavajući i stare i nove nazive
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || process.env.QB_CLIENT_ID;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || process.env.QB_REDIRECT_URI;
  
  const scope = 'com.intuit.quickbooks.accounting';
  
  // 3. GLAVNA IZMENA: Ubacujemo workspaceId direktno u state parametar!
  // Ako iz nekog razloga fali, šaljemo string upozorenja radi lakšeg debagovanja
  const state = workspaceId || 'missing_workspace_id'; 

  const qbAuthUrl = `https://appcenter.intuit.com/connect/oauth2` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&state=${state}`;

  return NextResponse.redirect(qbAuthUrl);
}
