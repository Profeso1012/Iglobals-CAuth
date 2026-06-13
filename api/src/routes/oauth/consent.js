// POST /api/oauth/consent
// Called by the consent page after user clicks "Allow"
const { getClientById } = require('../../db/queries/oauth_clients');
const { getConsentByUserClient, createConsent } = require('../../db/queries/user_consents');
const { createCode } = require('../../db/queries/authorization_codes');
const { logEvent } = require('../../db/queries/audit_log');
const { readIcaSession } = require('../../lib/session');
const { generateToken } = require('../../lib/crypto');

module.exports = async (req, res, next) => {
  try {
    const { client_id, redirect_uri, state, code_challenge, scopes, decision } = req.body;

    // decision: 'allow' | 'deny'
    if (decision === 'deny') {
      return res.json({ redirect_to: `${redirect_uri}?error=access_denied&state=${state}` });
    }

    const session = await readIcaSession(req);
    if (!session) {
      return res.status(401).json({ error: 'unauthorized', error_description: 'Session expired. Please log in again.', status: 401 });
    }

    const client = await getClientById(client_id);
    if (!client || !client.is_active || !client.redirect_uris.includes(redirect_uri)) {
      return res.status(400).json({ error: 'invalid_client', error_description: 'client_id not found or redirect_uri does not match.', status: 400 });
    }

    const requestedScopes = Array.isArray(scopes) ? scopes : (scopes || '').split(' ');
    if (!requestedScopes.every(s => client.allowed_scopes.includes(s))) {
      return res.status(400).json({ error: 'invalid_scope', error_description: 'One or more requested scopes are not permitted for this client.', status: 400 });
    }

    await createConsent({ user_id: session.user_id, client_id, scopes: requestedScopes });

    const code = generateToken(32);
    await createCode({
      code,
      client_id,
      user_id: session.user_id,
      scopes: requestedScopes,
      redirect_uri,
      code_challenge,
      code_challenge_method: 'S256',
    });

    await logEvent({ event_type: 'oauth.consent.granted', user_id: session.user_id, client_id, ip_address: req.ip });

    res.json({ redirect_to: `${redirect_uri}?code=${code}&state=${state}` });
  } catch (err) {
    next(err);
  }
};
