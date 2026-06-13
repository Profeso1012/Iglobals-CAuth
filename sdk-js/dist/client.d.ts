import { ICAConfig, TokenSet, UserInfoClaims, JWTPayload } from './types';
export declare class ICAClient {
    private config;
    private jwksService;
    constructor(config: ICAConfig);
    getAuthorizationUrl(state: string, codeChallenge: string): string;
    generatePKCE(): {
        codeVerifier: string;
        codeChallenge: string;
    };
    private requestToken;
    exchangeCode(code: string, codeVerifier: string): Promise<TokenSet>;
    refreshAccessToken(refreshToken: string): Promise<TokenSet>;
    getUserInfo(accessToken: string): Promise<UserInfoClaims>;
    verifyToken(jwt: string): Promise<JWTPayload>;
    revokeToken(refreshToken: string): Promise<{
        revoked: boolean;
    }>;
}
