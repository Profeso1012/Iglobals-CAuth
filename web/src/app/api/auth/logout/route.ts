import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession, destroyIcaSession } from '@/lib/session';
import { revokeSession, revokeAllUserSessions } from '@/lib/db/queries/ica_sessions';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/auth/logout - Logout user
export async function POST(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { global = false } = body;

    if (global) {
      // Revoke all sessions for this user
      await revokeAllUserSessions(session.user_id);
    } else {
      // Only revoke current session
      await revokeSession(session.id);
    }

    await logEvent({
      event_type: 'auth.logout',
      user_id: session.user_id,
      ip_address: getClientIp(req),
      metadata: { global }
    });

    const response = NextResponse.json({ success: true });
    await destroyIcaSession(req, response);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
