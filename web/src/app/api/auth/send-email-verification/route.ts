import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { getUserById } from '@/lib/db/queries/users';
import { createEmailVerification } from '@/lib/db/queries/email_verifications';
import { generateOTP, hashOTP } from '@/lib/crypto';
import { sendEmailVerificationOTP } from '@/lib/mailer';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/auth/send-email-verification - Send email verification OTP
export async function POST(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'not_found', error_description: 'User not found' },
        { status: 404 }
      );
    }

    if (user.email_verified) {
      return NextResponse.json(
        { error: 'already_verified', error_description: 'Email already verified' },
        { status: 400 }
      );
    }

    // Generate OTP (random for email verification)
    const otp = generateOTP(false);
    const otpHash = await hashOTP(otp);
    
    await createEmailVerification({
      user_id: user.id,
      email: user.email,
      otp_hash: otpHash
    });

    // Send email with formatted template
    await sendEmailVerificationOTP(user.email, user.first_name || 'User', otp);

    await logEvent({
      event_type: 'auth.email.verification.sent',
      user_id: session.user_id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send email verification error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
