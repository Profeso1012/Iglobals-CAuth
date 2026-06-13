import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { getLatestPhoneVerification, incrementPhoneAttempts, markPhoneVerified } from '@/lib/db/queries/phone_verifications';
import { setPhoneVerified } from '@/lib/db/queries/users';
import { verifyOTP } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/auth/verify-phone - Verify phone with OTP
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { otp } = body;

    if (!otp) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'OTP is required' },
        { status: 400 }
      );
    }

    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const verification = await getLatestPhoneVerification(session.user_id);
    if (!verification) {
      return NextResponse.json(
        { error: 'not_found', error_description: 'No verification request found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(verification.expires_at)) {
      return NextResponse.json(
        { error: 'expired', error_description: 'Verification code has expired' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (verification.attempts >= 5) {
      return NextResponse.json(
        { error: 'too_many_attempts', error_description: 'Too many failed attempts' },
        { status: 429 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, verification.otp_hash);
    if (!isValid) {
      await incrementPhoneAttempts(verification.id);
      
      await logEvent({
        event_type: 'auth.phone.verify.failed',
        user_id: session.user_id,
        ip_address: getClientIp(req),
      });

      return NextResponse.json(
        { error: 'invalid_otp', error_description: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark as verified
    await markPhoneVerified(verification.id);
    await setPhoneVerified(session.user_id);

    await logEvent({
      event_type: 'auth.phone.verified',
      user_id: session.user_id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Phone verification error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
