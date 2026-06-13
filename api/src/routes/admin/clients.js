const { createClient, updateClient, rotateSecret, listClients, getClientById } = require('../../db/queries/oauth_clients');
const { logEvent } = require('../../db/queries/audit_log');
const { generateToken, hashPassword, sha256 } = require('../../lib/crypto');

module.exports = async (req, res, next) => {
  try {
    const method = req.method;
    const { clientId } = req.params || {};

    // POST /api/admin/clients — create new client
    if (method === 'POST' && !clientId) {
      const { client_id, name, description, logo_url, redirect_uris, allowed_scopes } = req.body;

      if (!client_id || !name || !redirect_uris || !Array.isArray(redirect_uris)) {
        return res.status(422).json({ error: 'validation_error', error_description: 'client_id, name, and redirect_uris[] are required.', status: 422 });
      }

      // Check client_id not already taken
      const existing = await getClientById(client_id);
      if (existing) {
        return res.status(409).json({ error: 'client_id_taken', error_description: 'A client with this client_id already exists.', status: 409 });
      }

      const rawSecret = generateToken(32);
      const client_secret_hash = await hashPassword(rawSecret);

      const client = await createClient({
        client_id,
        client_secret_hash,
        name,
        description: description || null,
        logo_url: logo_url || null,
        redirect_uris,
        allowed_scopes: allowed_scopes || ['openid', 'profile', 'email'],
      });

      await logEvent({ event_type: 'admin.client.created', client_id, metadata: { name } });

      return res.status(201).json({
        client_id: client.client_id,
        client_secret: rawSecret, // shown only once
        name: client.name,
        redirect_uris: client.redirect_uris,
        allowed_scopes: client.allowed_scopes,
        created_at: client.created_at,
      });
    }

    // PATCH /api/admin/clients/:clientId — update client
    if (method === 'PATCH' && clientId) {
      const ALLOWED = ['name', 'description', 'logo_url', 'redirect_uris', 'allowed_scopes', 'is_active'];
      const updates = {};
      for (const key of ALLOWED) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(422).json({ error: 'validation_error', error_description: 'No updatable fields provided.', status: 422 });
      }

      const client = await updateClient(clientId, updates);
      if (!client) {
        return res.status(404).json({ error: 'not_found', error_description: 'Client not found.', status: 404 });
      }

      await logEvent({ event_type: 'admin.client.updated', client_id: clientId });

      const { client_secret_hash: _omit, ...safeClient } = client;
      return res.json(safeClient);
    }

    // POST /api/admin/clients/:clientId/rotate-secret
    if (method === 'POST' && clientId && req.path.endsWith('/rotate-secret')) {
      const rawSecret = generateToken(32);
      const newHash = await hashPassword(rawSecret);
      await rotateSecret(clientId, newHash);
      await logEvent({ event_type: 'admin.client.secret_rotated', client_id: clientId });
      return res.json({ client_id: clientId, client_secret: rawSecret });
    }

  } catch (err) {
    next(err);
  }
};
