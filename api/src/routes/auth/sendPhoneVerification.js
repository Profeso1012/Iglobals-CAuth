const { createPhoneVerification } = require('../../db/queries/phone_verifications');
const { logEvent } = require('../../db/queries/audit_log');
const { generateOTP, hashOTP } = require('../../lib/crypto');
const { sendOTP } = require('../../lib/sms');

function maskPhone(phone) {
  if (!phone) return null;
  return phone.slice(0, 7) + '****' + phone.slice(-3);
}

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;

    if (!user.phone) {
      return res.status(400).json({ error: 'no_phone', error_description: 'No phone number associated with this account.', status: 400 });
    }

    if (user.phone_verified) {
      return res.status(400).json({ error: 'already_verified', error_description: 'Phone is already verified.', status: 400 });
    }

    const otp = generateOTP();
    const otp_hash = await hashOTP(otp);
    await createPhoneVerification({ user_id: user.id, phone: user.phone, otp_hash });
    await sendOTP(user.phone, otp);
    await logEvent({ event_type: 'user.phone.otp_sent', user_id: user.id, ip_address: req.ip });

    res.json({ sent: true, phone: maskPhone(user.phone) });
  } catch (err) {
    next(err);
  }
};
