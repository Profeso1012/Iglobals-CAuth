import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    issuer: config.baseUrl,
    authorization_endpoint: `${config.baseUrl}/api/oauth/authorize`,
    token_endpoint: `${config.baseUrl}/api/oauth/token`,
    userinfo_endpoint: `${config.baseUrl}/api/oauth/userinfo`,
    jwks_uri: `${config.baseUrl}/api/oauth/jwks`,
    revocation_endpoint: `${config.baseUrl}/api/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'phone', 'address'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    code_challenge_methods_supported: ['S256'],
  });
}
