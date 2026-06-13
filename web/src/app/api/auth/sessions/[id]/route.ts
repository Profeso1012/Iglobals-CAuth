import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { revokeSession } from '@/lib/db/queries/ica_sessions';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// DELETE /api/auth/sessions/:id - Revoke a specific session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await readIcaSession(req);
    
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Revoke the specified session
    await revokeSession(id);

    await logEvent({
      event_type: 'auth.session.revoked',
      user_id: session.user_id,
      ip_address: getClientIp(req),
      metadata: { session_id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke session error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
