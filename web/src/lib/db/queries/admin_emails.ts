import { query } from '../pool';

export async function isAllowedAdminEmail(email: string) {
  const result = await query(`SELECT 1 FROM ica.admin_emails WHERE email = $1`, [email]);
  return result.rows.length > 0;
}
