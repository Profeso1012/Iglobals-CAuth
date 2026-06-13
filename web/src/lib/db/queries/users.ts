import { query } from '../pool';

export async function createUser({ email, password_hash, first_name, last_name, phone }: {
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  const result = await query(
    `INSERT INTO ica.users (email, password_hash, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email, password_hash, first_name, last_name, phone]
  );
  return result.rows[0];
}

export async function getUserById(id: string) {
  const result = await query(`SELECT * FROM ica.users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function getUserByEmail(email: string) {
  const result = await query(`SELECT * FROM ica.users WHERE email = $1`, [email]);
  return result.rows[0] || null;
}

export async function updateUser(id: string, fields: Record<string, any>) {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const result = await query(
    `UPDATE ica.users SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0];
}

export async function setEmailVerified(userId: string) {
  await query(`UPDATE ica.users SET email_verified = true, updated_at = NOW() WHERE id = $1`, [userId]);
}

export async function setPhoneVerified(userId: string) {
  await query(`UPDATE ica.users SET phone_verified = true, updated_at = NOW() WHERE id = $1`, [userId]);
}

export async function setPassword(userId: string, hash: string) {
  await query(`UPDATE ica.users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [userId, hash]);
}

export async function setActive(userId: string, bool: boolean) {
  await query(`UPDATE ica.users SET is_active = $2, updated_at = NOW() WHERE id = $1`, [userId, bool]);
}
