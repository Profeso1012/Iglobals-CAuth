import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { getClientById, rotateSecret } from '@/lib/db/queries/oauth_clients';
import { generateToken, hashPassword } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/admin/clients/:clientId/rotate-secret - Generate a new client secret
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { clientId } = await params;
    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'client_not_found', error_description: 'OAuth client not found' }, { status: 404 });
    }

    const newSecret = generateToken(32);
    const newHash = await hashPassword(newSecret);
    await rotateSecret(clientId, newHash);

    await logEvent({
      event_type: 'admin.client.secret_rotated',
      client_id: clientId,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ client_secret: newSecret });
  } catch (error) {
    console.error('Admin rotate secret error:', error);
    return NextResponse.json({ error: 'server_error', error_description: 'Internal server error' }, { status: 500 });
  }
}
