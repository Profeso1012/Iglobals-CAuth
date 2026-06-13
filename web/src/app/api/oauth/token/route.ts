import { NextRequest } from 'next/server';
import { getClientById } from '@/lib/db/queries/oauth_clients';
import { getCode, markCodeUsed } from '@/lib/db/queries/authorization_codes';
import { createToken, getTokenByHash, revokeToken, revokeAllForUserClient } from '@/lib/db/queries/refresh_tokens';
import { getUserById } from '@/lib/db/queries/users';
import { logEvent } from '@/lib/db/queries/audit_log';
import { verifyPassword, pkceChallenge, generateToken, sha256 } from '@/lib/crypto';
import { signAccessToken, signIdToken } from '@/lib/jwt';
import { json, errorResponse, parseBody, getClientIp } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req);
    if (!body) {
      return errorResponse('invalid_request', 'Invalid request body', 400);
    }

    const { grant_type, client_id, client_secret } = body;

    if (!['authorization_code', 'refresh_token'].includes(grant_type)) {
      return errorResponse('unsupported_grant_type', 'invalid grant type', 400);
    }

    const client = await getClientById(client_id);
    if (!client || !client.is_active || !(await verifyPassword(client_secret, client.client_secret_hash))) {
      return errorResponse('invalid_client', 'invalid client credentials', 401);
    }

    if (grant_type === 'authorization_code') {
      const { code, redirect_uri, code_verifier } = body;
      const authCode = await getCode(code);

      if (!authCode || authCode.used_at || new Date(authCode.expires_at) < new Date()) {
        return errorResponse('invalid_grant', 'invalid or expired code', 400);
      }
      if (authCode.redirect_uri !== redirect_uri) {
        return errorResponse('invalid_grant', 'redirect uri mismatch', 400);
      }
      if (pkceChallenge(code_verifier) !== authCode.code_challenge) {
        return errorResponse('invalid_grant', 'PKCE challenge failed', 400);
      }

      await markCodeUsed(authCode.id);
      const user = await getUserById(authCode.user_id);

      const access_token = signAccessToken({
        sub: user.id,
        aud: client_id,
        scope: authCode.scopes.join(' '),
        email: user.email,
        email_verified: user.email_verified
      });

      const id_token = signIdToken({
        sub: user.id,
        aud: client_id,
        claims: {
          email: user.email,
          email_verified: user.email_verified,
          given_name: user.first_name,
          family_name: user.last_name,
          phone_number: user.phone,
          phone_number_verified: user.phone_verified
        }
      });

      const rawRefreshToken = generateToken(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await createToken({
        token_hash: sha256(rawRefreshToken),
        client_id,
        user_id: user.id,
        scopes: authCode.scopes,
        expires_at: expiresAt,
      });

      await logEvent({
        event_type: 'oauth.code.exchanged',
        user_id: user.id,
        client_id,
        ip_address: getClientIp(req)
      });

      return json({
        access_token,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: rawRefreshToken,
        id_token,
        scope: authCode.scopes.join(' '),
      });
    }

    if (grant_type === 'refresh_token') {
      const { refresh_token } = body;
      const tokenRecord = await getTokenByHash(sha256(refresh_token));

      if (!tokenRecord) {
        return errorResponse('invalid_grant', 'invalid token', 400);
      }
      if (tokenRecord.revoked_at) {
        // Replay detected
        await revokeAllForUserClient(tokenRecord.user_id, client_id);
        return errorResponse('invalid_grant', 'Token reuse detected', 400);
      }
      if (new Date(tokenRecord.expires_at) < new Date() || tokenRecord.client_id !== client_id) {
        return errorResponse('invalid_grant', 'expired or invalid token', 400);
      }

      await revokeToken(tokenRecord.id);
      const user = await getUserById(tokenRecord.user_id);

      const access_token = signAccessToken({
        sub: user.id,
        aud: client_id,
        scope: tokenRecord.scopes.join(' '),
        email: user.email,
        email_verified: user.email_verified
      });

      const rawRefreshToken = generateToken(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await createToken({
        token_hash: sha256(rawRefreshToken),
        client_id,
        user_id: user.id,
        scopes: tokenRecord.scopes,
        expires_at: expiresAt,
      });

      await logEvent({
        event_type: 'oauth.token.refreshed',
        user_id: user.id,
        client_id,
        ip_address: getClientIp(req)
      });

      return json({
        access_token,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: rawRefreshToken,
        scope: tokenRecord.scopes.join(' '),
      });
    }

    return errorResponse('invalid_request', 'Invalid grant type', 400);
  } catch (err) {
    console.error('Token endpoint error:', err);
    return errorResponse('server_error', 'Internal server error', 500);
  }
}
