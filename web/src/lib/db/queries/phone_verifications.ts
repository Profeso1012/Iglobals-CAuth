import { query } from '../pool';

export async function createPhoneVerification({ user_id, phone, otp_hash }: {
  user_id: string;
  phone: string;
  otp_hash: string;
}) {
  const result = await query(
    `INSERT INTO ica.phone_verifications (user_id, phone, otp_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes') RETURNING *`,
    [user_id, phone, otp_hash]
  );
  return result.rows[0];
}

export async function getLatestPhoneVerification(userId: string) {
  const result = await query(
    `SELECT * FROM ica.phone_verifications WHERE user_id = $1 AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function incrementPhoneAttempts(id: string) {
  await query(`UPDATE ica.phone_verifications SET attempts = attempts + 1 WHERE id = $1`, [id]);
}

export async function markPhoneVerified(id: string) {
  await query(`UPDATE ica.phone_verifications SET verified_at = NOW() WHERE id = $1`, [id]);
}
