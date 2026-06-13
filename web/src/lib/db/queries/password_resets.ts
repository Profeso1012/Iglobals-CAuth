import { query } from '../pool';

export async function createResetRequest({ user_id, token_hash }: {
  user_id: string;
  token_hash: string;
}) {
  const result = await query(
    `INSERT INTO ica.password_reset_requests (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour') RETURNING *`,
    [user_id, token_hash]
  );
  return result.rows[0];
}

export async function getResetRequestByHash(hash: string) {
  const result = await query(
    `SELECT * FROM ica.password_reset_requests WHERE token_hash = $1`,
    [hash]
  );
  return result.rows[0] || null;
}

export async function markResetRequestUsed(id: string) {
  await query(`UPDATE ica.password_reset_requests SET used_at = NOW() WHERE id = $1`, [id]);
}
