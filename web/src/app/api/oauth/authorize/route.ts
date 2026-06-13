import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { getClientById } from '@/lib/db/queries/oauth_clients';
import { getConsentByUserClient } from '@/lib/db/queries/user_consents';
import { createCode } from '@/lib/db/queries/authorization_codes';
import { generateToken } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// GET /api/oauth/authorize - OAuth 2.0 authorization endpoint
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const response_type = searchParams.get('response_type');
    const client_id = searchParams.get('client_id');
    const redirect_uri = searchParams.get('redirect_uri');
    const scope = searchParams.get('scope') || 'openid';
    const state = searchParams.get('state') || '';
    const code_challenge = searchParams.get('code_challenge') || '';
    const code_challenge_method = searchParams.get('code_challenge_method') || 'S256';

    // Validate required parameters
    if (response_type !== 'code') {
      return NextResponse.json(
        { error: 'unsupported_response_type', error_description: 'Only response_type=code is supported' },
        { status: 400 }
      );
    }

    if (!client_id || !redirect_uri) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing client_id or redirect_uri' },
        { status: 400 }
      );
    }

    // Validate client
    const client = await getClientById(client_id);
    if (!client || !client.is_active) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Client not found or inactive' },
        { status: 404 }
      );
    }

    // Validate redirect URI
    if (!client.redirect_uris.includes(redirect_uri)) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect URI' },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const session = await readIcaSession(req);
    if (!session) {
      // Redirect to login with OAuth context
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('client_id', client_id);
      loginUrl.searchParams.set('redirect_uri', redirect_uri);
      loginUrl.searchParams.set('state', state);
      loginUrl.searchParams.set('code_challenge', code_challenge);
      loginUrl.searchParams.set('scope', scope);
      
      return NextResponse.redirect(loginUrl);
    }

    // Parse scopes
    const scopes = scope.split(' ').filter(Boolean);
    if (!scopes.includes('openid')) {
      scopes.unshift('openid');
    }

    // Check if user has already consented
    const existingConsent = await getConsentByUserClient(session.user_id, client_id);
    
    if (existingConsent) {
      // User has already consented - generate code directly
      const code = generateToken(32);
      await createCode({
        code,
        client_id,
        user_id: session.user_id,
        scopes,
        redirect_uri,
        code_challenge: code_challenge || '',
        code_challenge_method: code_challenge ? code_challenge_method : 'plain',
      });

      await logEvent({
        event_type: 'oauth.authorization.granted',
        user_id: session.user_id,
        ip_address: getClientIp(req),
        metadata: { client_id, consent: 'existing' }
      });

      const params = new URLSearchParams({
        code,
        ...(state && { state }),
      });

      return NextResponse.redirect(`${redirect_uri}?${params.toString()}`);
    }

    // No consent yet - redirect to consent page
    const consentUrl = new URL('/consent', req.url);
    consentUrl.searchParams.set('client_id', client_id);
    consentUrl.searchParams.set('redirect_uri', redirect_uri);
    consentUrl.searchParams.set('state', state);
    consentUrl.searchParams.set('code_challenge', code_challenge);
    consentUrl.searchParams.set('scope', scopes.join(' '));

    return NextResponse.redirect(consentUrl);
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
