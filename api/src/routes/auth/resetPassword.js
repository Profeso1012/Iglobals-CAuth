const { getResetRequestByHash, markResetRequestUsed } = require('../../db/queries/password_resets');
const { setPassword, getUserById } = require('../../db/queries/users');
const { revokeAllForUser } = require('../../db/queries/refresh_tokens');
const { revokeAllUserSessions } = require('../../db/queries/ica_sessions');
const { logEvent } = require('../../db/queries/audit_log');
const { sha256, hashPassword } = require('../../lib/crypto');

module.exports = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(422).json({ error: 'validation_error', error_description: 'token and new_password are required.', status: 422 });
    }

    if (new_password.length < 8) {
      return res.status(422).json({ error: 'validation_error', error_description: 'Password must be at least 8 characters.', status: 422 });
    }

    const token_hash = sha256(token);
    const request = await getResetRequestByHash(token_hash);

    if (!request) {
      return res.status(400).json({ error: 'invalid_token', error_description: 'Reset link is invalid or has expired.', status: 400 });
    }

    if (request.used_at) {
      return res.status(400).json({ error: 'token_used', error_description: 'This reset link has already been used.', status: 400 });
    }

    if (new Date(request.expires_at) < new Date()) {
      return res.status(400).json({ error: 'invalid_token', error_description: 'Reset link is invalid or has expired.', status: 400 });
    }

    const newHash = await hashPassword(new_password);
    await setPassword(request.user_id, newHash);
    await markResetRequestUsed(request.id);

    // Revoke all sessions & refresh tokens for security after password reset
    await revokeAllUserSessions(request.user_id);
    await revokeAllForUser(request.user_id);

    await logEvent({ event_type: 'user.password.reset', user_id: request.user_id, ip_address: req.ip });

    res.json({ reset: true });
  } catch (err) {
    next(err);
  }
};
