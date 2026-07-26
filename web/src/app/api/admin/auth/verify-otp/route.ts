import { NextRequest, NextResponse } from 'next/server';
import { validate, adminVerifyOtpSchema } from '@/lib/validation';
import { getLatestAdminOtp, incrementAdminOtpAttempts, markAdminOtpUsed } from '@/lib/db/queries/admin_otp';
import { verifyOTP } from '@/lib/crypto';
import { createAdminSession } from '@/lib/admin-session';
import { logEvent, countRecentEvents } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/admin/auth/verify-otp - Step 2: complete admin sign-in with the emailed code
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    let recentFailures = 0;
    try {
      recentFailures = await countRecentEvents({
        eventType: 'admin.otp.failed',
        ipAddress: ip,
        sinceMinutes: 15,
      });
    } catch (throttleError) {
      console.error('Admin OTP throttle check failed:', throttleError);
    }

    if (recentFailures >= 8) {
      return NextResponse.json(
        { error: 'too_many_requests', error_description: 'Too many failed attempts. Try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { value, error } = validate<{ email: string; otp: string }>(adminVerifyOtpSchema, body);
    if (error) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: error.message },
        { status: 400 }
      );
    }

    const email = value.email.toLowerCase();
    const otpRow = await getLatestAdminOtp(email);

    if (!otpRow) {
      await logEvent({ event_type: 'admin.otp.failed', ip_address: ip, metadata: { email, reason: 'no_active_code' } });
      return NextResponse.json(
        { error: 'invalid_otp', error_description: 'That code is invalid or has expired' },
        { status: 401 }
      );
    }

    const isValid = await verifyOTP(value.otp, otpRow.otp_hash);
    if (!isValid) {
      await incrementAdminOtpAttempts(otpRow.id);
      await logEvent({ event_type: 'admin.otp.failed', ip_address: ip, metadata: { email, reason: 'mismatch' } });
      return NextResponse.json(
        { error: 'invalid_otp', error_description: 'That code is invalid or has expired' },
        { status: 401 }
      );
    }

    await markAdminOtpUsed(otpRow.id);

    const response = NextResponse.json({ success: true });
    createAdminSession(response, email);

    await logEvent({ event_type: 'admin.login.success', ip_address: ip, metadata: { email } });

    return response;
  } catch (error) {
    console.error('Admin verify OTP error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
