const { listConsentsForUser, revokeConsent } = require('../../db/queries/user_consents');
const { revokeAllForUserClient } = require('../../db/queries/refresh_tokens');
const { logEvent } = require('../../db/queries/audit_log');

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;

    // GET /api/auth/apps
    if (req.method === 'GET') {
      const consents = await listConsentsForUser(user.id);
      const apps = consents.map(c => ({
        client_id: c.client_id,
        name: c.name,
        logo_url: c.logo_url,
        scopes: c.scopes,
        granted_at: c.granted_at,
      }));
      return res.json({ apps });
    }

    // DELETE /api/auth/apps/:clientId
    if (req.method === 'DELETE') {
      const { clientId } = req.params;
      // Revoke all refresh tokens for this user/client pair
      await revokeAllForUserClient(user.id, clientId);
      // Remove the consent record
      await revokeConsent(user.id, clientId);
      await logEvent({ event_type: 'user.app.revoked', user_id: user.id, metadata: { client_id: clientId }, ip_address: req.ip });
      return res.json({ revoked: true });
    }
  } catch (err) {
    next(err);
  }
};
