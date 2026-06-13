const db = require('../pool');

async function createToken({ token_hash, client_id, user_id, scopes, expires_at }) {
  const result = await db.query(
    `INSERT INTO ica.refresh_tokens (token_hash, client_id, user_id, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [token_hash, client_id, user_id, scopes, expires_at]
  );
  return result.rows[0];
}

async function getTokenByHash(hash) {
  const result = await db.query(`SELECT * FROM ica.refresh_tokens WHERE token_hash = $1`, [hash]);
  return result.rows[0] || null;
}

async function revokeToken(id) {
  await db.query(`UPDATE ica.refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [id]);
}

async function revokeAllForUserClient(userId, clientId) {
  await db.query(`UPDATE ica.refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND client_id = $2`, [userId, clientId]);
}

async function revokeAllForUser(userId) {
  await db.query(`UPDATE ica.refresh_tokens SET revoked_at = NOW() WHERE user_id = $1`, [userId]);
}

async function updateLastUsed(id) {
  await db.query(`UPDATE ica.refresh_tokens SET last_used_at = NOW() WHERE id = $1`, [id]);
}

module.exports = {
  createToken,
  getTokenByHash,
  revokeToken,
  revokeAllForUserClient,
  revokeAllForUser,
  updateLastUsed,
};
