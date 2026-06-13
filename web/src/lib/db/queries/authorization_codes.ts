import { query } from '../pool';

export async function createCode({ code, client_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method = 'S256' }: {
  code: string;
  client_id: string;
  user_id: string;
  scopes: string[];
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method?: string;
}) {
  const result = await query(
    `INSERT INTO ica.authorization_codes (code, client_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '10 minutes') RETURNING *`,
    [code, client_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method]
  );
  return result.rows[0];
}

export async function getCode(code: string) {
  const result = await query(`SELECT * FROM ica.authorization_codes WHERE code = $1`, [code]);
  return result.rows[0] || null;
}

export async function markCodeUsed(id: string) {
  await query(`UPDATE ica.authorization_codes SET used_at = NOW() WHERE id = $1`, [id]);
}

export async function deleteExpiredCodes() {
  await query(`DELETE FROM ica.authorization_codes WHERE expires_at < NOW() - INTERVAL '1 hour'`);
}
