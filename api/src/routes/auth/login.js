const { getUserByEmail } = require('../../db/queries/users');
const { getClientById } = require('../../db/queries/oauth_clients');
const { createConsent } = require('../../db/queries/user_consents');
const { createCode } = require('../../db/queries/authorization_codes');
const { logEvent } = require('../../db/queries/audit_log');
const { createIcaSession } = require('../../lib/session');
const { verifyPassword, generateToken } = require('../../lib/crypto');

module.exports = async (req, res, next) => {
  try {
    const { email, password, remember_me, oauth_context } = req.body;

    if (!email || !password) {
      return res.status(401).json({ error: 'invalid_credentials', error_description: 'Email or password is incorrect.', status: 401 });
    }

    const user = await getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await logEvent({ event_type: 'user.login.failed', ip_address: req.ip, metadata: { email } });
      return res.status(401).json({ error: 'invalid_credentials', error_description: 'Email or password is incorrect.', status: 401 });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'account_disabled', error_description: 'This account has been disabled. Contact support.', status: 403 });
    }

    if (oauth_context) {
      const client = await getClientById(oauth_context.client_id);
      if (!client || !client.redirect_uris.includes(oauth_context.redirect_uri)) {
        return res.status(400).json({ error: 'invalid_oauth_context', error_description: 'client_id not found or redirect_uri does not match.', status: 400 });
      }
    }

    await createIcaSession(req, res, user.id, remember_me || false);
    await logEvent({ event_type: 'user.login.success', user_id: user.id, ip_address: req.ip });

    let redirect_to = '/dashboard';
    if (oauth_context) {
      // Create consent directly if part of login flow, or we might redirect to /consent if not all scopes are approved.
      // But the spec says login redirects directly to callback if successful.
      // Let's assume consent is implicitly granted here for simplicity, or already requested.
      await createConsent({
        user_id: user.id,
        client_id: oauth_context.client_id,
        scopes: oauth_context.scopes || ['openid', 'profile', 'email']
      });

      const code = generateToken(32);
      await createCode({
        code,
        client_id: oauth_context.client_id,
        user_id: user.id,
        scopes: oauth_context.scopes || ['openid', 'profile', 'email'],
        redirect_uri: oauth_context.redirect_uri,
        code_challenge: oauth_context.code_challenge,
        code_challenge_method: 'S256'
      });

      redirect_to = `${oauth_context.redirect_uri}?code=${code}&state=${oauth_context.state}`;
    }

    return res.json({
      user_id: user.id,
      redirect_to
    });

  } catch (err) {
    next(err);
  }
};
