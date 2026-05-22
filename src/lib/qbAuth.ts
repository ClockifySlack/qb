import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getValidQBTokens(realmId: string): Promise<string> {
  const { data: connection, error } = await supabase
    .from('qb_connections')
    .select('*')
    .eq('realm_id', realmId)
    .single();

  if (error || !connection || !connection.access_token) {
    throw new Error('Nema aktivne QuickBooks konekcije. Molimo vas da povežete nalog u podešavanjima.');
  }

  const now = new Date();
  const expiresAt = new Date(connection.expires_at);

  expiresAt.setMinutes(expiresAt.getMinutes() - 5);

  if (now < expiresAt) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error('Nedostaje refresh token. Molimo vas da ponovo povežete QuickBooks nalog.');
  }

  const authString = Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64');

  const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authString}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  });

  if (!tokenResponse.ok) {
    await supabase.from('qb_connections').delete().eq('realm_id', realmId);
    throw new Error('QuickBooks sesija je istekla. Molimo vas da se ponovo povežete.');
  }

  const tokenData = await tokenResponse.json();

  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('qb_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq('realm_id', realmId);

  if (updateError) {
    throw new Error('Greška pri čuvanju novih tokena u bazu podataka.');
  }

  // 5. Vraćamo novi, svež access token rutama koje su ga tražile
  return tokenData.access_token;
}
