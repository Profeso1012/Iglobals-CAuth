import { query } from '../pool';

export async function createToken({ token_hash, client_id, user_id, scopes, expires_at }: {
  token_hash: string;
  client_id: string;
  user_id: string;
  scopes: string[];
  expires_at: Date;
}) {
  const result = await query(
    `INSERT INTO ica.refresh_tokens (token_hash, client_id, user_id, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [token_hash, client_id, user_id, scopes, expires_at]
  );
  return result.rows[0];
}

export async function getTokenByHash(hash: string) {
  const result = await query(`SELECT * FROM ica.refresh_tokens WHERE token_hash = $1`, [hash]);
  return result.rows[0] || null;
}

export async function revokeToken(id: string) {
  await query(`UPDATE ica.refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [id]);
}

export async function revokeAllForUserClient(userId: string, clientId: string) {
  await query(`UPDATE ica.refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND client_id = $2`, [userId, clientId]);
}

export async function revokeAllForUser(userId: string) {
  await query(`UPDATE ica.refresh_tokens SET revoked_at = NOW() WHERE user_id = $1`, [userId]);
}

export async function updateLastUsed(id: string) {
  await query(`UPDATE ica.refresh_tokens SET last_used_at = NOW() WHERE id = $1`, [id]);
}
