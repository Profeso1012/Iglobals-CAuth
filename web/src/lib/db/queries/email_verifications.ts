import { query } from '../pool';

export async function createEmailVerification({ user_id, email, otp_hash }: {
  user_id: string;
  email: string;
  otp_hash: string;
}) {
  const result = await query(
    `INSERT INTO ica.email_verifications (user_id, email, otp_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes') RETURNING *`,
    [user_id, email, otp_hash]
  );
  return result.rows[0];
}

export async function getLatestEmailVerification(userId: string) {
  const result = await query(
    `SELECT * FROM ica.email_verifications WHERE user_id = $1 AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function incrementAttempts(id: string) {
  await query(`UPDATE ica.email_verifications SET attempts = attempts + 1 WHERE id = $1`, [id]);
}

export async function markVerified(id: string) {
  await query(`UPDATE ica.email_verifications SET verified_at = NOW() WHERE id = $1`, [id]);
}
