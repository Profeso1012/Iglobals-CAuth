"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICAClient = void 0;
const errors_1 = require("./errors");
const pkce_1 = require("./pkce");
const jwks_1 = require("./jwks");
class ICAClient {
    config;
    jwksService;
    constructor(config) {
        if (!config.clientId)
            throw new Error('clientId is required');
        if (!config.redirectUri)
            throw new Error('redirectUri is required');
        if (!config.baseUrl)
            throw new Error('baseUrl is required');
        this.config = {
            ...config,
            scopes: config.scopes || ['openid', 'profile', 'email']
        };
        this.jwksService = new jwks_1.JWKSService(`${this.config.baseUrl}/api/oauth/jwks`);
    }
    getAuthorizationUrl(state, codeChallenge) {
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
    generatePKCE() {
        return (0, pkce_1.generatePKCE)();
    }
    async requestToken(body) {
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
            throw new errors_1.ICAError(data.error || 'request_failed', data.error_description || 'Failed to fetch token', res.status);
        }
        return data;
    }
    async exchangeCode(code, codeVerifier) {
        return this.requestToken({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.config.redirectUri,
            code_verifier: codeVerifier,
        });
    }
    async refreshAccessToken(refreshToken) {
        return this.requestToken({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });
    }
    async getUserInfo(accessToken) {
        const res = await fetch(`${this.config.baseUrl}/api/oauth/userinfo`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const data = await res.json();
        if (!res.ok) {
            throw new errors_1.ICAError(data.error || 'request_failed', data.error_description || 'Failed to fetch userinfo', res.status);
        }
        return data;
    }
    async verifyToken(jwt) {
        return this.jwksService.verifyToken(jwt, this.config.clientId, this.config.baseUrl);
    }
    async revokeToken(refreshToken) {
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
            throw new errors_1.ICAError(data.error || 'request_failed', data.error_description || 'Failed to revoke token', res.status);
        }
        return data;
    }
}
exports.ICAClient = ICAClient;
