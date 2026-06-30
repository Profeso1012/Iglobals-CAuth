import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { getUserById } from '@/lib/db/queries/users';
import { createPhoneVerification } from '@/lib/db/queries/phone_verifications';
import { generateOTP, hashOTP } from '@/lib/crypto';
import { sendSMS } from '@/lib/sms';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/auth/send-phone-verification - Send phone verification OTP
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

    if (!user.phone) {
      return NextResponse.json(
        { error: 'no_phone', error_description: 'No phone number on account' },
        { status: 400 }
      );
    }

    if (user.phone_verified) {
      return NextResponse.json(
        { error: 'already_verified', error_description: 'Phone already verified' },
        { status: 400 }
      );
    }

    // Generate OTP (fixed 654321 for phone since no KUDISMS subscription)
    const otp = generateOTP(true);
    const otpHash = await hashOTP(otp);
    
    await createPhoneVerification({
      user_id: user.id,
      phone: user.phone,
      otp_hash: otpHash
    });

    // Send SMS
    await sendSMS({
      to: user.phone,
      message: `Your iGlobals verification code is: ${otp}. Valid for 10 minutes.`
    });

    await logEvent({
      event_type: 'auth.phone.verification.sent',
      user_id: session.user_id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send phone verification error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
