import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { getClientById, updateClient } from '@/lib/db/queries/oauth_clients';
import { getClientUsage } from '@/lib/db/queries/analytics';
import { validate, adminUpdateClientSchema } from '@/lib/validation';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

function sanitize(client: Record<string, unknown>) {
  const { client_secret_hash: _client_secret_hash, ...safe } = client;
  return safe;
}

// GET /api/admin/clients/:clientId - Get client detail + usage stats
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) {
    return NextResponse.json({ error: 'client_not_found', error_description: 'OAuth client not found' }, { status: 404 });
  }

  const usage = await getClientUsage(clientId);

  return NextResponse.json({ client: sanitize(client), usage });
}

// PATCH /api/admin/clients/:clientId - Update client
export async function PATCH(
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

    const body = await req.json();
    const { value, error } = validate<Record<string, unknown>>(adminUpdateClientSchema, body);
    if (error) {
      return NextResponse.json({ error: 'invalid_request', error_description: error.message }, { status: 400 });
    }

    const updated = await updateClient(clientId, value);

    await logEvent({
      event_type: 'admin.client.updated',
      client_id: clientId,
      ip_address: getClientIp(req),
      metadata: { fields: Object.keys(value) },
    });

    return NextResponse.json({ client: sanitize(updated) });
  } catch (error) {
    console.error('Admin update client error:', error);
    return NextResponse.json({ error: 'server_error', error_description: 'Internal server error' }, { status: 500 });
  }
}
