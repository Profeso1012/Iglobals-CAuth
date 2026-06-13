const db = require('../pool');

async function createEmailVerification({ user_id, email, otp_hash }) {
  const result = await db.query(
    `INSERT INTO ica.email_verifications (user_id, email, otp_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes') RETURNING *`,
    [user_id, email, otp_hash]
  );
  return result.rows[0];
}

async function getLatestEmailVerification(userId) {
  const result = await db.query(
    `SELECT * FROM ica.email_verifications WHERE user_id = $1 AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function incrementAttempts(id) {
  await db.query(`UPDATE ica.email_verifications SET attempts = attempts + 1 WHERE id = $1`, [id]);
}

async function markVerified(id) {
  await db.query(`UPDATE ica.email_verifications SET verified_at = NOW() WHERE id = $1`, [id]);
}

module.exports = {
  createEmailVerification,
  getLatestEmailVerification,
  incrementAttempts,
  markVerified,
};
