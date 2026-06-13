const db = require('../pool');

async function createSession({ token_hash, user_id, user_agent, ip_address, remember_me }) {
  const expiresAt = remember_me ? "NOW() + INTERVAL '30 days'" : "NOW() + INTERVAL '1 day'";
  const result = await db.query(
    `INSERT INTO ica.ica_sessions (session_token_hash, user_id, user_agent, ip_address, remember_me, expires_at)
     VALUES ($1, $2, $3, $4, $5, ${expiresAt}) RETURNING *`,
    [token_hash, user_id, user_agent, ip_address, remember_me]
  );
  return result.rows[0];
}

async function getSessionByHash(hash) {
  const result = await db.query(
    `SELECT * FROM ica.ica_sessions WHERE session_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hash]
  );
  return result.rows[0] || null;
}

async function revokeSession(id) {
  await db.query(`UPDATE ica.ica_sessions SET revoked_at = NOW() WHERE id = $1`, [id]);
}

async function revokeAllUserSessions(userId) {
  await db.query(`UPDATE ica.ica_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}

async function listUserSessions(userId) {
  const result = await db.query(
    `SELECT * FROM ica.ica_sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW() ORDER BY last_active_at DESC`,
    [userId]
  );
  return result.rows;
}

async function touchSession(id) {
  await db.query(`UPDATE ica.ica_sessions SET last_active_at = NOW() WHERE id = $1`, [id]);
}

module.exports = {
  createSession,
  getSessionByHash,
  revokeSession,
  revokeAllUserSessions,
  listUserSessions,
  touchSession,
};
