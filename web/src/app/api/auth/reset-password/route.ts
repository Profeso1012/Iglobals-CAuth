import { NextRequest, NextResponse } from 'next/server';
import { getResetRequestByHash, markResetRequestUsed } from '@/lib/db/queries/password_resets';
import { setPassword } from '@/lib/db/queries/users';
import { hashPassword, sha256 } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/auth/reset-password - Reset password with token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, new_password } = body;

    if (!token || !new_password) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Hash token and look up reset request
    const tokenHash = sha256(token);
    const resetRequest = await getResetRequestByHash(tokenHash);

    if (!resetRequest) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if already used
    if (resetRequest.used_at) {
      return NextResponse.json(
        { error: 'token_used', error_description: 'This reset token has already been used' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > new Date(resetRequest.expires_at)) {
      return NextResponse.json(
        { error: 'token_expired', error_description: 'This reset token has expired' },
        { status: 400 }
      );
    }

    // Hash new password and update
    const passwordHash = await hashPassword(new_password);
    await setPassword(resetRequest.user_id, passwordHash);

    // Mark token as used
    await markResetRequestUsed(resetRequest.id);

    await logEvent({
      event_type: 'auth.password.reset',
      user_id: resetRequest.user_id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
