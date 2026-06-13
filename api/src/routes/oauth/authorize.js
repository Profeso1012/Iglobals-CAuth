const { getClientById } = require('../../db/queries/oauth_clients');
const { getConsentByUserClient } = require('../../db/queries/user_consents');
const { createCode } = require('../../db/queries/authorization_codes');
const { logEvent } = require('../../db/queries/audit_log');
const { readIcaSession } = require('../../lib/session');
const { generateToken } = require('../../lib/crypto');

module.exports = async (req, res, next) => {
  try {
    const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;

    if (!client_id || !redirect_uri || !response_type || !scope || !state || !code_challenge || code_challenge_method !== 'S256') {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing or invalid parameters', status: 400 });
    }

    const client = await getClientById(client_id);
    if (!client || !client.is_active) {
      return res.status(400).json({ error: 'invalid_client', error_description: 'Client not found or inactive', status: 400 });
    }

    if (!client.redirect_uris.includes(redirect_uri)) {
      return res.status(400).json({ error: 'invalid_client', error_description: 'Redirect URI mismatch', status: 400 });
    }

    if (response_type !== 'code') {
      return res.redirect(`${redirect_uri}?error=unsupported_response_type&state=${state}`);
    }

    const requestedScopes = scope.split(' ');
    if (!requestedScopes.includes('openid') || !requestedScopes.every(s => client.allowed_scopes.includes(s))) {
      return res.redirect(`${redirect_uri}?error=invalid_scope&state=${state}`);
    }

    const session = await readIcaSession(req);
    if (!session) {
      const qs = new URLSearchParams(req.query).toString();
      return res.redirect(`/login?${qs}`);
    }

    const consent = await getConsentByUserClient(session.user_id, client_id);
    const hasConsentedAll = consent && requestedScopes.every(s => consent.scopes.includes(s));

    if (!hasConsentedAll) {
      const qs = new URLSearchParams(req.query).toString();
      return res.redirect(`/consent?${qs}`);
    }

    const code = generateToken(32);
    await createCode({
      code,
      client_id,
      user_id: session.user_id,
      scopes: requestedScopes,
      redirect_uri,
      code_challenge,
      code_challenge_method
    });

    await logEvent({ event_type: 'oauth.code.issued', user_id: session.user_id, client_id, ip_address: req.ip });

    return res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
  } catch (err) {
    next(err);
  }
};
