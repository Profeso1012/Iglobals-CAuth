const { getClientById } = require('../../db/queries/oauth_clients');
const { getCode, markCodeUsed } = require('../../db/queries/authorization_codes');
const { createToken, getTokenByHash, revokeToken, revokeAllForUserClient, updateLastUsed } = require('../../db/queries/refresh_tokens');
const { getUserById } = require('../../db/queries/users');
const { logEvent } = require('../../db/queries/audit_log');
const { verifyPassword, pkceChallenge, generateToken, sha256 } = require('../../lib/crypto');
const { signAccessToken, signIdToken } = require('../../lib/jwt');

module.exports = async (req, res, next) => {
  try {
    const { grant_type, client_id, client_secret } = req.body;

    if (!['authorization_code', 'refresh_token'].includes(grant_type)) {
      return res.status(400).json({ error: 'unsupported_grant_type', error_description: 'invalid grant type', status: 400 });
    }

    const client = await getClientById(client_id);
    if (!client || !client.is_active || !(await verifyPassword(client_secret, client.client_secret_hash))) {
      return res.status(401).json({ error: 'invalid_client', error_description: 'invalid client credentials', status: 401 });
    }

    if (grant_type === 'authorization_code') {
      const { code, redirect_uri, code_verifier } = req.body;
      const authCode = await getCode(code);

      if (!authCode || authCode.used_at || new Date(authCode.expires_at) < new Date()) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'invalid or expired code', status: 400 });
      }
      if (authCode.redirect_uri !== redirect_uri) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect uri mismatch', status: 400 });
      }
      if (pkceChallenge(code_verifier) !== authCode.code_challenge) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE challenge failed', status: 400 });
      }

      await markCodeUsed(authCode.id);
      const user = await getUserById(authCode.user_id);

      const access_token = signAccessToken({
        sub: user.id, aud: client_id, scope: authCode.scopes.join(' '), email: user.email, email_verified: user.email_verified
      });

      const id_token = signIdToken({
        sub: user.id, aud: client_id, claims: {
          email: user.email, email_verified: user.email_verified,
          given_name: user.first_name, family_name: user.last_name,
          phone_number: user.phone, phone_number_verified: user.phone_verified
        }
      });

      const rawRefreshToken = generateToken(32);
      await createToken({
        token_hash: sha256(rawRefreshToken),
        client_id,
        user_id: user.id,
        scopes: authCode.scopes,
        expires_at: "NOW() + INTERVAL '30 days'",
      });

      await logEvent({ event_type: 'oauth.code.exchanged', user_id: user.id, client_id, ip_address: req.ip });

      return res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: rawRefreshToken,
        id_token,
        scope: authCode.scopes.join(' '),
      });
    }

    if (grant_type === 'refresh_token') {
      const { refresh_token } = req.body;
      const tokenRecord = await getTokenByHash(sha256(refresh_token));

      if (!tokenRecord) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'invalid token', status: 400 });
      }
      if (tokenRecord.revoked_at) {
        // Replay detected
        await revokeAllForUserClient(tokenRecord.user_id, client_id);
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Token reuse detected', status: 400 });
      }
      if (new Date(tokenRecord.expires_at) < new Date() || tokenRecord.client_id !== client_id) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'expired or invalid token', status: 400 });
      }

      await revokeToken(tokenRecord.id);
      const user = await getUserById(tokenRecord.user_id);

      const access_token = signAccessToken({
        sub: user.id, aud: client_id, scope: tokenRecord.scopes.join(' '), email: user.email, email_verified: user.email_verified
      });

      const rawRefreshToken = generateToken(32);
      await createToken({
        token_hash: sha256(rawRefreshToken),
        client_id,
        user_id: user.id,
        scopes: tokenRecord.scopes,
        expires_at: "NOW() + INTERVAL '30 days'",
      });

      await logEvent({ event_type: 'oauth.token.refreshed', user_id: user.id, client_id, ip_address: req.ip });

      return res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: rawRefreshToken,
        scope: tokenRecord.scopes.join(' '),
      });
    }

  } catch (err) {
    next(err);
  }
};
