const db = require('../pool');

async function createUser({ email, password_hash, first_name, last_name, phone }) {
  const result = await db.query(
    `INSERT INTO ica.users (email, password_hash, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email, password_hash, first_name, last_name, phone]
  );
  return result.rows[0];
}

async function getUserById(id) {
  const result = await db.query(`SELECT * FROM ica.users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function getUserByEmail(email) {
  const result = await db.query(`SELECT * FROM ica.users WHERE email = $1`, [email]);
  return result.rows[0] || null;
}

async function updateUser(id, fields) {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE ica.users SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0];
}

async function setEmailVerified(userId) {
  await db.query(`UPDATE ica.users SET email_verified = true, updated_at = NOW() WHERE id = $1`, [userId]);
}

async function setPhoneVerified(userId) {
  await db.query(`UPDATE ica.users SET phone_verified = true, updated_at = NOW() WHERE id = $1`, [userId]);
}

async function setPassword(userId, hash) {
  await db.query(`UPDATE ica.users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [userId, hash]);
}

async function setActive(userId, bool) {
  await db.query(`UPDATE ica.users SET is_active = $2, updated_at = NOW() WHERE id = $1`, [userId, bool]);
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  setEmailVerified,
  setPhoneVerified,
  setPassword,
  setActive,
};
