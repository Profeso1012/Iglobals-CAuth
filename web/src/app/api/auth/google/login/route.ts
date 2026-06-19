import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const oauthState = url.searchParams.get('state');
  const codeChallenge = url.searchParams.get('code_challenge');
  const scope = url.searchParams.get('scope');

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return NextResponse.json({ error: 'google_auth_not_configured' }, { status: 500 });
  }

  // Create a state to verify callback
  const statePayload = {
    nonce: Math.random().toString(36).substring(2),
    oauthContext: clientId ? {
      client_id: clientId,
      redirect_uri: redirectUri,
      state: oauthState,
      code_challenge: codeChallenge,
      scope: scope
    } : null
  };

  const stateStr = Buffer.from(JSON.stringify(statePayload)).toString('base64');
  const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || url.origin}/api/auth/google/callback`;

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', googleClientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUrl);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', stateStr);
  googleAuthUrl.searchParams.set('access_type', 'online');

  const response = NextResponse.redirect(googleAuthUrl.toString());
  
  // Set a cookie to prevent CSRF
  response.cookies.set('google_oauth_state', statePayload.nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10 // 10 minutes
  });

  return response;
}
