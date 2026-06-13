const { getClientById } = require('../../db/queries/oauth_clients');
const { getTokenByHash, revokeToken } = require('../../db/queries/refresh_tokens');
const { verifyPassword, sha256 } = require('../../lib/crypto');

module.exports = async (req, res, next) => {
  try {
    const { token, client_id, client_secret } = req.body;

    const client = await getClientById(client_id);
    if (!client || !client.is_active || !(await verifyPassword(client_secret, client.client_secret_hash))) {
      return res.status(401).json({ error: 'invalid_client', error_description: 'invalid client credentials', status: 401 });
    }

    const tokenRecord = await getTokenByHash(sha256(token));
    if (!tokenRecord || tokenRecord.client_id !== client_id) {
      // Don't leak if token doesn't exist vs wrong client
      return res.status(404).json({ error: 'token_not_found', error_description: 'Token does not exist or belongs to a different client.', status: 404 });
    }

    await revokeToken(tokenRecord.id);
    return res.json({ revoked: true });

  } catch (err) {
    next(err);
  }
};
