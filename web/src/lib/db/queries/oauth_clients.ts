import { query } from '../pool';

export async function getClientById(clientId: string) {
  const result = await query(`SELECT * FROM ica.oauth_clients WHERE client_id = $1`, [clientId]);
  return result.rows[0] || null;
}

export async function createClient(fields: {
  client_id: string;
  client_secret_hash: string;
  name: string;
  description?: string;
  logo_url?: string;
  redirect_uris: string[];
  allowed_scopes: string[];
}) {
  const { client_id, client_secret_hash, name, description, logo_url, redirect_uris, allowed_scopes } = fields;
  const result = await query(
    `INSERT INTO ica.oauth_clients (client_id, client_secret_hash, name, description, logo_url, redirect_uris, allowed_scopes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [client_id, client_secret_hash, name, description, logo_url, redirect_uris, allowed_scopes]
  );
  return result.rows[0];
}

export async function updateClient(clientId: string, fields: Record<string, any>) {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const result = await query(
    `UPDATE ica.oauth_clients SET ${setClauses}, updated_at = NOW() WHERE client_id = $1 RETURNING *`,
    [clientId, ...values]
  );
  return result.rows[0];
}

export async function rotateSecret(clientId: string, newHash: string) {
  await query(`UPDATE ica.oauth_clients SET client_secret_hash = $2, updated_at = NOW() WHERE client_id = $1`, [clientId, newHash]);
}

export async function listClients() {
  const result = await query(`SELECT * FROM ica.oauth_clients WHERE is_active = true`);
  return result.rows;
}
