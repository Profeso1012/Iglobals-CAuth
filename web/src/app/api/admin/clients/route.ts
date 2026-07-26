import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { listAllClients, getClientById, createClient } from '@/lib/db/queries/oauth_clients';
import { generateToken, hashPassword } from '@/lib/crypto';
import { validate, adminCreateClientSchema } from '@/lib/validation';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

function sanitize(client: Record<string, unknown>) {
  const { client_secret_hash: _client_secret_hash, ...safe } = client;
  return safe;
}

// GET /api/admin/clients - List all OAuth clients
export async function GET(req: NextRequest) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  const clients = await listAllClients();
  return NextResponse.json({ clients: clients.map(sanitize) });
}

// POST /api/admin/clients - Create a new OAuth client
export async function POST(req: NextRequest) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { value, error } = validate<{
      client_id: string;
      name: string;
      description?: string;
      logo_url?: string;
      redirect_uris: string[];
      allowed_scopes: string[];
    }>(adminCreateClientSchema, body);

    if (error) {
      return NextResponse.json({ error: 'invalid_request', error_description: error.message }, { status: 400 });
    }

    const existing = await getClientById(value.client_id);
    if (existing) {
      return NextResponse.json(
        { error: 'client_exists', error_description: 'A client with this client_id already exists' },
        { status: 409 }
      );
    }

    const clientSecret = generateToken(32);
    const clientSecretHash = await hashPassword(clientSecret);

    const client = await createClient({
      client_id: value.client_id,
      client_secret_hash: clientSecretHash,
      name: value.name,
      description: value.description,
      logo_url: value.logo_url,
      redirect_uris: value.redirect_uris,
      allowed_scopes: value.allowed_scopes,
    });

    await logEvent({
      event_type: 'admin.client.created',
      client_id: client.client_id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({
      client: sanitize(client),
      client_secret: clientSecret,
    }, { status: 201 });
  } catch (error) {
    console.error('Admin create client error:', error);
    return NextResponse.json({ error: 'server_error', error_description: 'Internal server error' }, { status: 500 });
  }
}
