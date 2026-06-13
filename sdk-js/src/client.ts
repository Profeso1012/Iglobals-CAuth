import { ICAConfig, TokenSet, UserInfoClaims, JWTPayload } from './types';
import { ICAError } from './errors';
import { generatePKCE } from './pkce';
import { JWKSService } from './jwks';

export class ICAClient {
  private config: ICAConfig;
  private jwksService: JWKSService;

  constructor(config: ICAConfig) {
    if (!config.clientId) throw new Error('clientId is required');
    if (!config.redirectUri) throw new Error('redirectUri is required');
    if (!config.baseUrl) throw new Error('baseUrl is required');
    
    this.config = {
      ...config,
      scopes: config.scopes || ['openid', 'profile', 'email']
    };
    
    this.jwksService = new JWKSService(`${this.config.baseUrl}/api/oauth/jwks`);
  }

  public getAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${this.config.baseUrl}/api/oauth/authorize?${params.toString()}`;
  }

  public generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    return generatePKCE();
  }

  private async requestToken(body: Record<string, string>): Promise<TokenSet> {
    const res = await fetch(`${this.config.baseUrl}/api/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ICAError(data.error || 'request_failed', data.error_description || 'Failed to fetch token', res.status);
    }

    return data as TokenSet;
  }

  public async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    return this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });
  }

  public async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    return this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  public async getUserInfo(accessToken: string): Promise<UserInfoClaims> {
    const res = await fetch(`${this.config.baseUrl}/api/oauth/userinfo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ICAError(data.error || 'request_failed', data.error_description || 'Failed to fetch userinfo', res.status);
    }

    return data as UserInfoClaims;
  }

  public async verifyToken(jwt: string): Promise<JWTPayload> {
    return this.jwksService.verifyToken(jwt, this.config.clientId, this.config.baseUrl);
  }

  public async revokeToken(refreshToken: string): Promise<{ revoked: boolean }> {
    const res = await fetch(`${this.config.baseUrl}/api/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ICAError(data.error || 'request_failed', data.error_description || 'Failed to revoke token', res.status);
    }

    return data as { revoked: boolean };
  }
}
