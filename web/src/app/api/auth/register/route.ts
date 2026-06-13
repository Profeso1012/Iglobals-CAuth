import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db/queries/users';
import { hashPassword, generateOTP, hashOTP } from '@/lib/crypto';
import { createEmailVerification } from '@/lib/db/queries/email_verifications';
import { createIcaSession } from '@/lib/session';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';

// POST /api/auth/register - Register new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, first_name, last_name, phone } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'user_exists', error_description: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser({
      email,
      password_hash: passwordHash,
      first_name: first_name || '',
      last_name: last_name || '',
      phone: phone || null
    });

    await logEvent({
      event_type: 'user.registered',
      user_id: user.id,
      ip_address: getClientIp(req),
    });

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await createEmailVerification({
      user_id: user.id,
      email: user.email,
      otp_hash: otpHash
    });

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your iGlobals account',
        html: `
          <p>Welcome to iGlobals!</p>
          <p>Your verification code is: <strong>${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    // Create session
    const response = NextResponse.json({
      success: true,
      user_id: user.id,
      redirect_to: '/verify-email'
    });
    
    await createIcaSession(req, response, user.id, false);

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
