import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function getValidQBTokens(realmId: string) {
  const { data: connection, error } = await supabase
    .from('qb_connections')
    .select('*')
    .eq('realm_id', realmId)
    .single();

  if (error || !connection) {
    throw new Error('QuickBooks veza nije pronađena za ovu kompaniju.');
  }

  const expiresAt = new Date(connection.expires_at).getTime();
  const now = Date.now();

  if (now < expiresAt - 30000) {
    return connection.access_token;
  }

  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error('Neuspešno osvežavanje QuickBooks pristupnog tokena.');
  }

  const newTokens = await response.json();

  await supabase
    .from('qb_connections')
    .upsert({
      realm_id: realmId,
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
    }, { onConflict: 'realm_id' });

  return newTokens.access_token;
}
