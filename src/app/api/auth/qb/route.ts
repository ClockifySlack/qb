export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';


export async function GET() {
  const clientId = process.env.QB_CLIENT_ID;
  const redirectUri = process.env.QB_REDIRECT_URI;
  
  const scope = 'com.intuit.quickbooks.accounting';
  const state = process.env.QB_JWT_SECRET || 'random_state_string'; 

  const qbAuthUrl = `https://appcenter.intuit.com/connect/oauth2` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&state=${state}`;

  return NextResponse.redirect(qbAuthUrl);
}
