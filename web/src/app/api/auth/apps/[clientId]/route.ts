import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { revokeConsent } from '@/lib/db/queries/user_consents';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// DELETE /api/auth/apps/:clientId - Revoke app consent
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const session = await readIcaSession(req);
    
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    await revokeConsent(session.user_id, clientId);

    await logEvent({
      event_type: 'oauth.consent.revoked',
      user_id: session.user_id,
      ip_address: getClientIp(req),
      metadata: { client_id: clientId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke consent error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
