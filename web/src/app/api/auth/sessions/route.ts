import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { listUserSessions } from '@/lib/db/queries/ica_sessions';

// GET /api/auth/sessions - List user sessions
export async function GET(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessions = await listUserSessions(session.user_id);
    
    // Add current session indicator
    const sessionsWithCurrent = sessions.map((s: any) => ({
      ...s,
      is_current: s.id === session.id
    }));

    return NextResponse.json({ sessions: sessionsWithCurrent });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
