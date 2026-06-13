import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { getClientById } from '@/lib/db/queries/oauth_clients';
import { createCode } from '@/lib/db/queries/authorization_codes';
import { createConsent } from '@/lib/db/queries/user_consents';
import { generateToken } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// POST /api/oauth/consent - Process OAuth consent decision
export async function POST(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      client_id,
      redirect_uri,
      state,
      code_challenge,
      scopes = ['openid'],
      decision,
    } = body;

    // Validate required parameters
    if (!client_id || !redirect_uri || decision !== 'allow' && decision !== 'deny') {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // Get OAuth client
    const client = await getClientById(client_id);
    if (!client) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Client not found' },
        { status: 404 }
      );
    }

    // Verify redirect URI
    if (!client.redirect_uris.includes(redirect_uri)) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

    // Handle denial
    if (decision === 'deny') {
      await logEvent({
        event_type: 'oauth.consent.denied',
        user_id: session.user_id,
        ip_address: getClientIp(req),
        metadata: { client_id }
      });

      const params = new URLSearchParams({
        error: 'access_denied',
        error_description: 'User denied authorization',
        ...(state && { state }),
      });

      return NextResponse.json({
        redirect_to: `${redirect_uri}?${params.toString()}`
      });
    }

    // Handle approval - create consent
    await createConsent({
      user_id: session.user_id,
      client_id,
      scopes: Array.isArray(scopes) ? scopes : scopes.split(' '),
    });

    // Generate authorization code
    const code = generateToken(32);
    await createCode({
      code,
      client_id,
      user_id: session.user_id,
      scopes: Array.isArray(scopes) ? scopes : scopes.split(' '),
      redirect_uri,
      code_challenge: code_challenge || '',
      code_challenge_method: code_challenge ? 'S256' : 'plain',
    });

    await logEvent({
      event_type: 'oauth.consent.granted',
      user_id: session.user_id,
      ip_address: getClientIp(req),
      metadata: { client_id, scopes }
    });

    // Redirect back with authorization code
    const params = new URLSearchParams({
      code,
      ...(state && { state }),
    });

    return NextResponse.json({
      redirect_to: `${redirect_uri}?${params.toString()}`
    });
  } catch (error) {
    console.error('OAuth consent error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
