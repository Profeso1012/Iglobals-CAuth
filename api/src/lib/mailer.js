const config = require('../config');
// In a real implementation we would use nodemailer or a transactional email API.
// For this scaffolding, we simulate sending emails.

async function sendOTP(email, otp) {
  console.log(`[MAILER] Sending OTP ${otp} to ${email}`);
  // return nodemailer transport logic here
  return true;
}

async function sendPasswordReset(email, token) {
  console.log(`[MAILER] Sending password reset link with token ${token} to ${email}`);
  return true;
}

module.exports = {
  sendOTP,
  sendPasswordReset,
};
