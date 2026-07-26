import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { config } from '@/lib/config';
import { validate, adminLoginSchema } from '@/lib/validation';
import { isAllowedAdminEmail } from '@/lib/db/queries/admin_emails';
import { createAdminOtp } from '@/lib/db/queries/admin_otp';
import { generateOTP, hashOTP } from '@/lib/crypto';
import { sendAdminLoginOTP } from '@/lib/mailer';
import { logEvent, countRecentEvents } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal length to avoid leaking length via timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// POST /api/admin/auth/login - Step 1: passphrase + email -> sends a one-time code by email
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    let recentFailures = 0;
    try {
      recentFailures = await countRecentEvents({
        eventType: 'admin.login.failed',
        ipAddress: ip,
        sinceMinutes: 15,
      });
    } catch (throttleError) {
      console.error('Admin login throttle check failed:', throttleError);
    }

    if (recentFailures >= 5) {
      return NextResponse.json(
        { error: 'too_many_requests', error_description: 'Too many failed attempts. Try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { value, error } = validate<{ secret: string; email: string }>(adminLoginSchema, body);
    if (error) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: error.message },
        { status: 400 }
      );
    }

    const email = value.email.toLowerCase();
    const secretValid = !!config.adminSecret && timingSafeEqual(value.secret, config.adminSecret);
    const emailAllowed = secretValid && await isAllowedAdminEmail(email);

    if (!secretValid || !emailAllowed) {
      await logEvent({
        event_type: 'admin.login.failed',
        ip_address: ip,
        metadata: { email, reason: !secretValid ? 'invalid_secret' : 'email_not_allowed' },
      });
      // Deliberately generic — never reveal which part (secret vs. email) was wrong.
      return NextResponse.json(
        { error: 'invalid_credentials', error_description: 'Invalid passphrase or email' },
        { status: 401 }
      );
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await createAdminOtp({ email, otp_hash: otpHash });

    const sent = await sendAdminLoginOTP(email, otp);

    await logEvent({
      event_type: 'admin.otp.sent',
      ip_address: ip,
      metadata: { email },
    });

    return NextResponse.json({ success: true, otp_required: true, email_sent: sent });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
