import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { getUserById } from '@/lib/db/queries/users';
import { createResetRequest } from '@/lib/db/queries/password_resets';
import { generateToken, sha256 } from '@/lib/crypto';
import { sendPasswordReset } from '@/lib/mailer';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/admin/users/:id/reset-password - Send a password reset email (admin never sets a literal password)
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

  if (!user.password_hash) {
    return NextResponse.json(
      { error: 'no_password_set', error_description: 'This account uses Google Sign-In and has no password to reset' },
      { status: 400 }
    );
  }

  const token = generateToken(32);
  await createResetRequest({ user_id: user.id, token_hash: sha256(token) });
  const sent = await sendPasswordReset(user.email, token);

  await logEvent({
    event_type: 'admin.user.password_reset_triggered',
    user_id: user.id,
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ success: true, email_sent: sent });
}
