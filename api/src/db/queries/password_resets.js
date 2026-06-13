const db = require('../pool');

async function createResetRequest({ user_id, token_hash }) {
  const result = await db.query(
    `INSERT INTO ica.password_reset_requests (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour') RETURNING *`,
    [user_id, token_hash]
  );
  return result.rows[0];
}

async function getResetRequestByHash(hash) {
  const result = await db.query(
    `SELECT * FROM ica.password_reset_requests WHERE token_hash = $1`,
    [hash]
  );
  return result.rows[0] || null;
}

async function markResetRequestUsed(id) {
  await db.query(`UPDATE ica.password_reset_requests SET used_at = NOW() WHERE id = $1`, [id]);
}

module.exports = {
  createResetRequest,
  getResetRequestByHash,
  markResetRequestUsed,
};
