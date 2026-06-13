const config = require('../config');
// Termii/Twilio SMS integration mock

async function sendOTP(phone, otp) {
  console.log(`[SMS] Sending OTP ${otp} to ${phone}`);
  return true;
}

module.exports = {
  sendOTP,
};
