import { NextRequest } from 'next/server';
import { getClientById } from '@/lib/db/queries/oauth_clients';
import { getTokenByHash, revokeToken } from '@/lib/db/queries/refresh_tokens';
import { verifyPassword, sha256 } from '@/lib/crypto';
import { json, errorResponse, parseBody } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req);
    if (!body) {
      return errorResponse('invalid_request', 'Invalid request body', 400);
    }

    const { token, client_id, client_secret } = body;

    const client = await getClientById(client_id);
    if (!client || !client.is_active || !(await verifyPassword(client_secret, client.client_secret_hash))) {
      return errorResponse('invalid_client', 'invalid client credentials', 401);
    }

    const tokenRecord = await getTokenByHash(sha256(token));
    if (!tokenRecord || tokenRecord.client_id !== client_id) {
      // Don't leak if token doesn't exist vs wrong client
      return errorResponse('token_not_found', 'Token does not exist or belongs to a different client.', 404);
    }

    await revokeToken(tokenRecord.id);
    return json({ revoked: true });
  } catch (err) {
    console.error('Revoke endpoint error:', err);
    return errorResponse('server_error', 'Internal server error', 500);
  }
}
