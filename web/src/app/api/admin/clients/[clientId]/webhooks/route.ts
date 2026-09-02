import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { getClientById } from '@/lib/db/queries/oauth_clients';
import { getWebhookConfig, upsertWebhookConfig, updateWebhookUrl, rotateRelaySecret } from '@/lib/db/queries/client_webhook_configs';
import { generateToken, encryptSecret } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

const PROVIDER = 'paystack';

function sanitize(config: any) {
  if (!config) return null;
  const { relay_secret_encrypted, ...rest } = config;
  return rest;
}

// GET /api/admin/clients/:clientId/webhooks - current config, secret never included
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { clientId } = await params;
    const config = await getWebhookConfig(clientId, PROVIDER);
    return NextResponse.json({ config: sanitize(config) });
  } catch (error) {
    console.error('Admin get webhook config error:', error);
    return NextResponse.json({ error: 'server_error', error_description: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/clients/:clientId/webhooks - set/update the webhook_url.
// First call for a client also generates its relay secret (returned once,
// same one-time-reveal pattern as client_secret). A later call with an
// existing config just updates the URL and leaves the secret untouched -
// use rotate-secret to get a new one.
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

    const body = await req.json().catch(() => null);
    const webhookUrl = body?.webhook_url;
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json({ error: 'invalid_request', error_description: 'webhook_url is required' }, { status: 400 });
    }

    const existing = await getWebhookConfig(clientId, PROVIDER);
    let relaySecret: string | null = null;

    if (existing) {
      await updateWebhookUrl(clientId, PROVIDER, webhookUrl);
    } else {
      relaySecret = generateToken(32);
      await upsertWebhookConfig({
        client_id: clientId,
        provider: PROVIDER,
        webhook_url: webhookUrl,
        relay_secret_encrypted: encryptSecret(relaySecret),
      });
    }

    await logEvent({
      event_type: existing ? 'admin.client.webhook_updated' : 'admin.client.webhook_created',
      client_id: clientId,
      ip_address: getClientIp(req),
    });

    const config = await getWebhookConfig(clientId, PROVIDER);
    return NextResponse.json({
      config: sanitize(config),
      ...(relaySecret ? { relay_secret: relaySecret } : {}),
    });
  } catch (error) {
    console.error('Admin set webhook config error:', error);
    return NextResponse.json({ error: 'server_error', error_description: 'Internal server error' }, { status: 500 });
  }
}
