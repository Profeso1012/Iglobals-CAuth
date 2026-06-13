const { getUserByEmail } = require('../../db/queries/users');
const { createResetRequest } = require('../../db/queries/password_resets');
const { logEvent } = require('../../db/queries/audit_log');
const { generateToken, sha256 } = require('../../lib/crypto');
const { sendPasswordReset } = require('../../lib/mailer');
const config = require('../../config');

// Always return the same response regardless of whether the email exists (anti-enumeration)
const SAFE_RESPONSE = {
  sent: true,
  message: 'If an account with that email exists, a reset link has been sent.',
};

module.exports = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(422).json({ error: 'validation_error', error_description: 'Email is required.', status: 422 });
    }

    const user = await getUserByEmail(email);
    if (user && user.is_active) {
      const rawToken = generateToken(32);
      const token_hash = sha256(rawToken);
      await createResetRequest({ user_id: user.id, token_hash });
      // The reset link includes the raw token in the URL
      const resetLink = `${config.baseUrl}/reset-password?token=${rawToken}`;
      await sendPasswordReset(user.email, resetLink);
      await logEvent({ event_type: 'user.password.reset_requested', user_id: user.id, ip_address: req.ip });
    }

    // Always respond the same way
    res.json(SAFE_RESPONSE);
  } catch (err) {
    next(err);
  }
};
