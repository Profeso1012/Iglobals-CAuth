import { query } from '../pool';

export async function createAdminOtp({ email, otp_hash }: { email: string; otp_hash: string }) {
  const result = await query(
    `INSERT INTO ica.admin_otp_requests (email, otp_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes') RETURNING *`,
    [email, otp_hash]
  );
  return result.rows[0];
}

export async function getLatestAdminOtp(email: string) {
  const result = await query(
    `SELECT * FROM ica.admin_otp_requests
     WHERE email = $1 AND used_at IS NULL AND expires_at > NOW() AND attempts < 5
     ORDER BY created_at DESC LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function incrementAdminOtpAttempts(id: string) {
  await query(`UPDATE ica.admin_otp_requests SET attempts = attempts + 1 WHERE id = $1`, [id]);
}

export async function markAdminOtpUsed(id: string) {
  await query(`UPDATE ica.admin_otp_requests SET used_at = NOW() WHERE id = $1`, [id]);
}
