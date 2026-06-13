const db = require('../pool');

async function createCode({ code, client_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method = 'S256' }) {
  const result = await db.query(
    `INSERT INTO ica.authorization_codes (code, client_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '10 minutes') RETURNING *`,
    [code, client_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method]
  );
  return result.rows[0];
}

async function getCode(code) {
  const result = await db.query(`SELECT * FROM ica.authorization_codes WHERE code = $1`, [code]);
  return result.rows[0] || null;
}

async function markCodeUsed(id) {
  await db.query(`UPDATE ica.authorization_codes SET used_at = NOW() WHERE id = $1`, [id]);
}

async function deleteExpiredCodes() {
  await db.query(`DELETE FROM ica.authorization_codes WHERE expires_at < NOW() - INTERVAL '1 hour'`);
}

module.exports = {
  createCode,
  getCode,
  markCodeUsed,
  deleteExpiredCodes,
};
