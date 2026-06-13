import { query } from '../pool';

export async function createConsent({ user_id, client_id, scopes }: {
  user_id: string;
  client_id: string;
  scopes: string[];
}) {
  const result = await query(
    `INSERT INTO ica.user_consents (user_id, client_id, scopes)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, client_id) WHERE revoked_at IS NULL
     DO UPDATE SET scopes = EXCLUDED.scopes, granted_at = NOW()
     RETURNING *`,
    [user_id, client_id, scopes]
  );
  return result.rows[0];
}

export async function getConsentByUserClient(userId: string, clientId: string) {
  const result = await query(
    `SELECT * FROM ica.user_consents WHERE user_id = $1 AND client_id = $2 AND revoked_at IS NULL`,
    [userId, clientId]
  );
  return result.rows[0] || null;
}

export async function revokeConsent(userId: string, clientId: string) {
  await query(
    `UPDATE ica.user_consents SET revoked_at = NOW() WHERE user_id = $1 AND client_id = $2 AND revoked_at IS NULL`,
    [userId, clientId]
  );
}

export async function listConsentsForUser(userId: string) {
  const result = await query(
    `SELECT c.*, cl.name, cl.logo_url FROM ica.user_consents c
     JOIN ica.oauth_clients cl ON c.client_id = cl.client_id
     WHERE c.user_id = $1 AND c.revoked_at IS NULL`,
    [userId]
  );
  return result.rows;
}
