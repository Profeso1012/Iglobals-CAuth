// In a real implementation we would use nodemailer or a transactional email API.
// For this scaffolding, we simulate sending emails.

export async function sendOTP(email: string, otp: string) {
  console.log(`[MAILER] Sending OTP ${otp} to ${email}`);
  // return nodemailer transport logic here
  return true;
}

export async function sendPasswordReset(email: string, token: string) {
  console.log(`[MAILER] Sending password reset link with token ${token} to ${email}`);
  return true;
}
