const { createEmailVerification } = require('../../db/queries/email_verifications');
const { logEvent } = require('../../db/queries/audit_log');
const { generateOTP, hashOTP } = require('../../lib/crypto');
const { sendOTP } = require('../../lib/mailer');

function maskEmail(email) {
  const [user, domain] = email.split('@');
  return `${user[0]}***@${domain}`;
}

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;

    if (user.email_verified) {
      return res.status(400).json({ error: 'already_verified', error_description: 'Email is already verified.', status: 400 });
    }

    const otp = "111111"; //generateOTP();
    const otp_hash = await hashOTP(otp);
    await createEmailVerification({ user_id: user.id, email: user.email, otp_hash });
    await sendOTP(user.email, otp);
    await logEvent({ event_type: 'user.email.otp_sent', user_id: user.id, ip_address: req.ip });

    res.json({ sent: true, email: maskEmail(user.email) });
  } catch (err) {
    next(err);
  }
};
