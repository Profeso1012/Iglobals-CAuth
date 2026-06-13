const { verifyPassword, hashPassword } = require('../../lib/crypto');
const { setPassword } = require('../../db/queries/users');
const { revokeAllForUser } = require('../../db/queries/refresh_tokens');
const { logEvent } = require('../../db/queries/audit_log');

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(422).json({ error: 'validation_error', error_description: 'current_password and new_password are required.', status: 422 });
    }

    if (new_password.length < 8) {
      return res.status(422).json({ error: 'validation_error', error_description: 'New password must be at least 8 characters.', status: 422 });
    }

    const isCorrect = await verifyPassword(current_password, user.password_hash);
    if (!isCorrect) {
      return res.status(401).json({ error: 'invalid_password', error_description: 'Current password is incorrect.', status: 401 });
    }

    const newHash = await hashPassword(new_password);
    await setPassword(user.id, newHash);
    // Revoke all refresh tokens across all clients to force re-login
    await revokeAllForUser(user.id);
    await logEvent({ event_type: 'user.password.changed', user_id: user.id, ip_address: req.ip });

    res.json({ changed: true });
  } catch (err) {
    next(err);
  }
};
