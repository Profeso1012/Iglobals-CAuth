import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { revokeConsent } from '@/lib/db/queries/user_consents';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// DELETE /api/admin/users/:id/apps/:clientId - Revoke a user's consent for an OAuth client
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  const { id, clientId } = await params;
  await revokeConsent(id, clientId);

  await logEvent({
    event_type: 'admin.user.app_revoked',
    user_id: id,
    client_id: clientId,
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ success: true });
}
