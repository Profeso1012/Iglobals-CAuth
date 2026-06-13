const { getLatestPhoneVerification, incrementPhoneAttempts, markPhoneVerified } = require('../../db/queries/phone_verifications');
const { setPhoneVerified } = require('../../db/queries/users');
const { logEvent } = require('../../db/queries/audit_log');
const { verifyOTP } = require('../../lib/crypto');
const { touchSession } = require('../../db/queries/ica_sessions');

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;
    const { otp } = req.body;

    if (!otp) {
      return res.status(422).json({ error: 'validation_error', error_description: 'OTP is required.', status: 422 });
    }

    const verification = await getLatestPhoneVerification(user.id);

    if (!verification) {
      return res.status(400).json({ error: 'no_pending_verification', error_description: 'No pending phone verification. Request a new code.', status: 400 });
    }

    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ error: 'otp_expired', error_description: 'The verification code has expired. Request a new one.', status: 400 });
    }

    if (verification.attempts >= 5) {
      return res.status(429).json({ error: 'too_many_attempts', error_description: 'Maximum attempts reached. Request a new code.', status: 429 });
    }

    await incrementPhoneAttempts(verification.id);

    const valid = await verifyOTP(otp, verification.otp_hash);
    if (!valid) {
      return res.status(400).json({ error: 'invalid_otp', error_description: 'The code is incorrect.', status: 400 });
    }

    await markPhoneVerified(verification.id);
    await setPhoneVerified(user.id);
    await touchSession(req.icaSessionId);
    await logEvent({ event_type: 'user.phone.verified', user_id: user.id, ip_address: req.ip });

    res.json({ phone_verified: true });
  } catch (err) {
    next(err);
  }
};
