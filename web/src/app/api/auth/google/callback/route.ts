import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserByProviderId, createUser } from '@/lib/db/queries/users';
import { createIcaSession } from '@/lib/session';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateStr = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }

  if (!code || !stateStr) {
    return NextResponse.redirect(new URL('/login?error=missing_code_or_state', req.url));
  }

  const cookieStateNonce = req.cookies.get('google_oauth_state')?.value;
  if (!cookieStateNonce) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', req.url));
  }

  let statePayload;
  try {
    statePayload = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
  } catch (e) {
    return NextResponse.redirect(new URL('/login?error=invalid_state_format', req.url));
  }

  if (statePayload.nonce !== cookieStateNonce) {
    return NextResponse.redirect(new URL('/login?error=state_mismatch', req.url));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || url.origin}/api/auth/google/callback`;

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.json({ error: 'google_auth_not_configured' }, { status: 500 });
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token error:', tokenData);
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', req.url));
    }

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    if (!userRes.ok || !userData.email) {
      console.error('Google userinfo error:', userData);
      return NextResponse.redirect(new URL('/login?error=google_user_info_failed', req.url));
    }

    const { id: googleId, email, given_name, family_name, verified_email } = userData;

    // Check if user exists by provider id
    let user = await getUserByProviderId('google', googleId);

    if (!user) {
      // Check if user exists by email
      user = await getUserByEmail(email);
      if (!user) {
        // Create new user
        user = await createUser({
          email,
          password_hash: null, // No password for OAuth users
          first_name: given_name || '',
          last_name: family_name || '',
          auth_provider: 'google',
          auth_provider_id: googleId,
          email_verified: verified_email === true,
        });
        
        await logEvent({
          event_type: 'user.created',
          user_id: user.id,
          ip_address: getClientIp(req),
          metadata: { provider: 'google' }
        });
      } else {
        // We could link the account here if we wanted to
        // For now, let's just proceed with the existing user and assume email means same user
        // (In a real app, you might want to explicitly link or fail)
      }
    }

    if (!user.is_active) {
      return NextResponse.redirect(new URL('/login?error=account_disabled', req.url));
    }

    await logEvent({
      event_type: 'auth.login.success',
      user_id: user.id,
      ip_address: getClientIp(req),
      metadata: { provider: 'google' }
    });

    let targetUrl = '/dashboard';

    // If OAuth context exists, redirect to consent
    if (statePayload.oauthContext?.client_id) {
      const { client_id, redirect_uri, state, code_challenge, scope } = statePayload.oauthContext;
      const params = new URLSearchParams({
        client_id,
        redirect_uri: redirect_uri || '',
        state: state || '',
        code_challenge: code_challenge || '',
        scope: scope || 'openid profile email',
      });
      targetUrl = `/oauth/consent?${params.toString()}`;
    }

    const response = NextResponse.redirect(new URL(targetUrl, req.url));
    
    // Create session
    await createIcaSession(req, response, user.id, true);

    // Clear the state cookie
    response.cookies.delete('google_oauth_state');

    return response;

  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', req.url));
  }
}
