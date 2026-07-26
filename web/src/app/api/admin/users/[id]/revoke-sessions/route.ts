import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { getUserById } from '@/lib/db/queries/users';
import { revokeAllUserSessions } from '@/lib/db/queries/ica_sessions';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/admin/users/:id/revoke-sessions - Force logout everywhere
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: 'not_found', error_description: 'User not found' }, { status: 404 });
  }

  await revokeAllUserSessions(id);

  await logEvent({
    event_type: 'admin.user.sessions_revoked',
    user_id: id,
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ success: true });
}
