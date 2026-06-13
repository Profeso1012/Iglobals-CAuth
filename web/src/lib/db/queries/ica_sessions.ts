import { query } from '../pool';

export async function createSession({ token_hash, user_id, user_agent, ip_address, remember_me }: {
  token_hash: string;
  user_id: string;
  user_agent?: string;
  ip_address?: string;
  remember_me: boolean;
}) {
  const expiresAt = remember_me ? "NOW() + INTERVAL '30 days'" : "NOW() + INTERVAL '1 day'";
  const result = await query(
    `INSERT INTO ica.ica_sessions (session_token_hash, user_id, user_agent, ip_address, remember_me, expires_at)
     VALUES ($1, $2, $3, $4, $5, ${expiresAt}) RETURNING *`,
    [token_hash, user_id, user_agent, ip_address, remember_me]
  );
  return result.rows[0];
}

export async function getSessionByHash(hash: string) {
  const result = await query(
    `SELECT * FROM ica.ica_sessions WHERE session_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hash]
  );
  return result.rows[0] || null;
}

export async function revokeSession(id: string) {
  await query(`UPDATE ica.ica_sessions SET revoked_at = NOW() WHERE id = $1`, [id]);
}

export async function revokeAllUserSessions(userId: string) {
  await query(`UPDATE ica.ica_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}

export async function listUserSessions(userId: string) {
  const result = await query(
    `SELECT * FROM ica.ica_sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW() ORDER BY last_active_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function touchSession(id: string) {
  await query(`UPDATE ica.ica_sessions SET last_active_at = NOW() WHERE id = $1`, [id]);
}
