import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { getWebhookConfig, rotateRelaySecret } from '@/lib/db/queries/client_webhook_configs';
import { generateToken, encryptSecret } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

const PROVIDER = 'paystack';

// POST /api/admin/clients/:clientId/webhooks/rotate-secret
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
    const existing = await getWebhookConfig(clientId, PROVIDER);
    if (!existing) {
      return NextResponse.json({ error: 'config_not_found', error_description: 'No webhook configured for this client yet' }, { status: 404 });
    }

    const newSecret = generateToken(32);
    await rotateRelaySecret(clientId, PROVIDER, encryptSecret(newSecret));

    await logEvent({
      event_type: 'admin.client.webhook_secret_rotated',
      client_id: clientId,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ relay_secret: newSecret });
  } catch (error) {
    console.error('Admin rotate webhook secret error:', error);
    return NextResponse.json({ error: 'server_error', error_description: 'Internal server error' }, { status: 500 });
  }
}
