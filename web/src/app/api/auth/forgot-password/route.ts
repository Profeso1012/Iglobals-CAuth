import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db/queries/users';
import { createResetRequest } from '@/lib/db/queries/password_resets';
import { generateToken, sha256 } from '@/lib/crypto';
import { sendPasswordReset } from '@/lib/mailer';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/auth/forgot-password - Initiate password reset
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await getUserByEmail(email);
    
    // Security: Always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      console.log(`[forgot-password] User not found for email: ${email}`);
      return NextResponse.json({ success: true });
    }

    // Check if user has a password (or signed up with Google)
    if (!user.password_hash) {
      console.log(`[forgot-password] User has no password (Google sign-up): ${email}`);
      // Return a specific error for Google users so they know what's wrong
      return NextResponse.json({
        error: 'no_password_set',
        error_description: 'This account was created using Google Sign-In and has no password set. Please sign in with Google, then set a password in Security settings.'
      }, { status: 400 });
    }

    // Generate reset token
    const token = generateToken(32);
    const tokenHash = sha256(token);

    // Store reset request
    await createResetRequest({
      user_id: user.id,
      token_hash: tokenHash,
    });

    // Send reset email with token
    const sent = await sendPasswordReset(user.email, token);

    if (!sent) {
      console.error('[forgot-password] Failed to send email');
      // Still return success to prevent email enumeration
    }

    await logEvent({
      event_type: 'auth.password.reset_requested',
      user_id: user.id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
