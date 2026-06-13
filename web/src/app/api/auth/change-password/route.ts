import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { getUserById, setPassword } from '@/lib/db/queries/users';
import { verifyPassword, hashPassword } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/auth/change-password - Change user password
export async function POST(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Current and new password required' },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = await getUserById(session.user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'not_found', error_description: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValid = await verifyPassword(current_password, user.password_hash);
    if (!isValid) {
      await logEvent({
        event_type: 'auth.password.change.failed',
        user_id: session.user_id,
        ip_address: getClientIp(req),
        metadata: { reason: 'invalid_current_password' }
      });

      return NextResponse.json(
        { error: 'invalid_credentials', error_description: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash and set new password
    const newHash = await hashPassword(new_password);
    await setPassword(session.user_id, newHash);

    await logEvent({
      event_type: 'auth.password.changed',
      user_id: session.user_id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
