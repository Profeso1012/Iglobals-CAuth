import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db/queries/users';
import { createIcaSession } from '@/lib/session';
import { verifyPassword } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, remember_me = false, oauth_context } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'invalid_credentials', error_description: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await logEvent({
        event_type: 'auth.login.failed',
        user_id: user.id,
        ip_address: getClientIp(req),
        metadata: { reason: 'invalid_password' }
      });

      return NextResponse.json(
        { error: 'invalid_credentials', error_description: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'account_disabled', error_description: 'Account has been disabled' },
        { status: 403 }
      );
    }

    // Create session
    const response = NextResponse.json({ success: true, redirect_to: '/dashboard' });
    await createIcaSession(req, response, user.id, remember_me);

    await logEvent({
      event_type: 'auth.login.success',
      user_id: user.id,
      ip_address: getClientIp(req),
    });

    // If OAuth context provided, redirect to consent
    if (oauth_context?.client_id) {
      const params = new URLSearchParams({
        client_id: oauth_context.client_id,
        redirect_uri: oauth_context.redirect_uri || '',
        state: oauth_context.state || '',
        code_challenge: oauth_context.code_challenge || '',
        scope: oauth_context.scopes?.join(' ') || 'openid profile email',
      });
      return NextResponse.json({
        success: true,
        redirect_to: `/oauth/consent?${params.toString()}`
      }, {
        headers: response.headers
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
