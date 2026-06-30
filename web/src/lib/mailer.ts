import nodemailer from 'nodemailer';
import { config } from './config';

const isDev = config.nodeEnv !== 'production';

// Dev logger — only prints in development
const devLog = (...args: any[]) => { 
  if (isDev) console.log('[mailer:dev]', ...args); 
};

// SMTP transporter (fallback only)
let smtpTransporter: nodemailer.Transporter | null = null;

const getSmtpTransporter = () => {
  if (smtpTransporter) return smtpTransporter;
  
  if (!config.smtp.user || !config.smtp.pass) return null;

  smtpTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    pool: false, // fresh connection per send — avoids silent idle timeouts
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: { rejectUnauthorized: false },
  } as nodemailer.TransportOptions);

  return smtpTransporter;
};

// Core send function
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  // ── Path 1: Brevo API (preferred — works without SMTP config) ──────────────
  if (config.brevo.apiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.brevo.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { 
            name: config.smtp.from.split('<')[0].trim() || 'iGlobals', 
            email: 'hello@iglobalseducationalservices.org'
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.message || errorData.code || response.statusText;
        console.error(`[mailer] ✗ Brevo API failed → ${to} | "${subject}" | ${detail}`);
        // Fall through to SMTP
      } else {
        console.log(`[mailer] ✓ Sent via Brevo API → ${to} | "${subject}"`);
        return true;
      }
    } catch (apiErr: any) {
      const detail = apiErr.message || 'Unknown error';
      console.error(`[mailer] ✗ Brevo API failed → ${to} | "${subject}" | ${detail}`);
      // Fall through to SMTP
    }
  }

  // ── Path 2: SMTP fallback ──────────────────────────────────────────────────
  const mailer = getSmtpTransporter();
  if (mailer) {
    try {
      await Promise.race([
        mailer.sendMail({ 
          from: `"${config.smtp.from.split('<')[0].trim()}" <${config.smtp.user}>`, 
          to, 
          subject, 
          html 
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMTP timeout')), 10000)
        ),
      ]);
      smtpTransporter = null; // reset after each send to avoid stale connections
      console.log(`[mailer] ✓ Sent via SMTP → ${to} | "${subject}"`);
      return true;
    } catch (smtpErr: any) {
      smtpTransporter = null;
      console.error(`[mailer] ✗ SMTP also failed → ${to} | "${subject}" | ${smtpErr.message}`);
    }
  }

  // ── Both paths failed ──────────────────────────────────────────────────────
  console.error(`[mailer] ✗ ALL SEND METHODS FAILED → ${to} | "${subject}" | No BREVO_API_KEY and no SMTP credentials configured`);
  
  // In development, still return true so app doesn't break
  if (isDev) {
    devLog(`Would send to ${to}: ${subject}`);
    return true;
  }
  
  return false;
}

// Simple HTML layout
const simpleLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
    <div style="background:#2563eb;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;">iGlobals Auth</h1>
    </div>
    <div style="padding:32px;color:#333333;line-height:1.6;">
      ${content}
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#666666;">
      <p style="margin:0;">© ${new Date().getFullYear()} iGlobals Auth. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const otpBlock = (code: string) => `
<div style="background:#f0f9ff;border:2px solid #2563eb;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
  <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;">${code}</div>
</div>
`;

// Send email verification OTP
export async function sendEmailVerificationOTP(email: string, firstName: string, otp: string): Promise<boolean> {
  const html = simpleLayout(`
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>Thank you for registering with iGlobals Auth. Please verify your email address using the code below:</p>
    ${otpBlock(otp)}
    <p style="color:#666;font-size:14px;">This code expires in <strong>10 minutes</strong>. If you didn't create an account, please ignore this email.</p>
  `);

  return sendEmail(email, 'Verify your email address', html);
}

// Send password reset OTP
export async function sendPasswordResetOTP(email: string, firstName: string, otp: string, resetUrl: string): Promise<boolean> {
  const html = simpleLayout(`
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>You requested to reset your password. Use the code below to verify your identity:</p>
    ${otpBlock(otp)}
    <p>Or click the link below:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;">Reset Password</a>
    </p>
    <p style="color:#666;font-size:14px;">This code expires in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.</p>
  `);

  return sendEmail(email, 'Reset your password', html);
}

// Legacy compatibility
export async function sendOTP(email: string, otp: string) {
  console.log(`[MAILER] Sending OTP ${otp} to ${email}`);
  const html = simpleLayout(`
    <p>Your verification code is:</p>
    ${otpBlock(otp)}
    <p style="color:#666;font-size:14px;">This code expires in 10 minutes.</p>
  `);
  return sendEmail(email, 'Your verification code', html);
}

export async function sendPasswordReset(email: string, token: string) {
  console.log(`[MAILER] Sending password reset link with token ${token} to ${email}`);
  const resetUrl = `${config.baseUrl}/reset-password?token=${token}`;
  const html = simpleLayout(`
    <p>You requested a password reset. Click the button below to reset your password:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;">Reset Password</a>
    </p>
    <p style="color:#666;font-size:14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
  `);
  return sendEmail(email, 'Reset your password', html);
}
