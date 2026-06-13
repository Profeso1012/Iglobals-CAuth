const db = require('../pool');

async function createPhoneVerification({ user_id, phone, otp_hash }) {
  const result = await db.query(
    `INSERT INTO ica.phone_verifications (user_id, phone, otp_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes') RETURNING *`,
    [user_id, phone, otp_hash]
  );
  return result.rows[0];
}

async function getLatestPhoneVerification(userId) {
  const result = await db.query(
    `SELECT * FROM ica.phone_verifications WHERE user_id = $1 AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function incrementPhoneAttempts(id) {
  await db.query(`UPDATE ica.phone_verifications SET attempts = attempts + 1 WHERE id = $1`, [id]);
}

async function markPhoneVerified(id) {
  await db.query(`UPDATE ica.phone_verifications SET verified_at = NOW() WHERE id = $1`, [id]);
}

module.exports = {
  createPhoneVerification,
  getLatestPhoneVerification,
  incrementPhoneAttempts,
  markPhoneVerified,
};
