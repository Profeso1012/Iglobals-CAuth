const db = require('../pool');

async function getClientById(clientId) {
  const result = await db.query(`SELECT * FROM ica.oauth_clients WHERE client_id = $1`, [clientId]);
  return result.rows[0] || null;
}

async function createClient(fields) {
  const { client_id, client_secret_hash, name, description, logo_url, redirect_uris, allowed_scopes } = fields;
  const result = await db.query(
    `INSERT INTO ica.oauth_clients (client_id, client_secret_hash, name, description, logo_url, redirect_uris, allowed_scopes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [client_id, client_secret_hash, name, description, logo_url, redirect_uris, allowed_scopes]
  );
  return result.rows[0];
}

async function updateClient(clientId, fields) {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE ica.oauth_clients SET ${setClauses}, updated_at = NOW() WHERE client_id = $1 RETURNING *`,
    [clientId, ...values]
  );
  return result.rows[0];
}

async function rotateSecret(clientId, newHash) {
  await db.query(`UPDATE ica.oauth_clients SET client_secret_hash = $2, updated_at = NOW() WHERE client_id = $1`, [clientId, newHash]);
}

async function listClients() {
  const result = await db.query(`SELECT * FROM ica.oauth_clients WHERE is_active = true`);
  return result.rows;
}

module.exports = {
  getClientById,
  createClient,
  updateClient,
  rotateSecret,
  listClients,
};
