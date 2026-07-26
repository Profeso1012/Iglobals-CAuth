import { query } from '../pool';

export async function createUser({ email, password_hash, first_name, last_name, phone, auth_provider = 'local', auth_provider_id, email_verified = false }: {
  email: string;
  password_hash?: string | null;
  first_name?: string;
  last_name?: string;
  phone?: string;
  auth_provider?: string;
  auth_provider_id?: string;
  email_verified?: boolean;
}) {
  const result = await query(
    `INSERT INTO ica.users (email, password_hash, first_name, last_name, phone, auth_provider, auth_provider_id, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [email, password_hash, first_name, last_name, phone, auth_provider, auth_provider_id, email_verified]
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

export async function getUserByProviderId(provider: string, providerId: string) {
  const result = await query(
    `SELECT * FROM ica.users WHERE auth_provider = $1 AND auth_provider_id = $2`,
    [provider, providerId]
  );
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

export async function listUsers({ search, status, verified, page = 1, limit = 20 }: {
  search?: string;
  status?: 'active' | 'suspended';
  verified?: 'email' | 'email_pending' | 'phone' | 'phone_pending';
  page?: number;
  limit?: number;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(email ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR phone ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (status === 'active') conditions.push('is_active = true');
  if (status === 'suspended') conditions.push('is_active = false');
  if (verified === 'email') conditions.push('email_verified = true');
  if (verified === 'email_pending') conditions.push('email_verified = false');
  if (verified === 'phone') conditions.push('phone_verified = true');
  if (verified === 'phone_pending') conditions.push('phone_verified = false');

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*)::int AS count FROM ica.users ${where}`, params);
  const total = countResult.rows[0].count;

  const offset = (Math.max(page, 1) - 1) * limit;
  const result = await query(
    `SELECT id, email, email_verified, phone, phone_verified, auth_provider, first_name, last_name, is_active, created_at, updated_at
     FROM ica.users ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return { rows: result.rows, total };
}
