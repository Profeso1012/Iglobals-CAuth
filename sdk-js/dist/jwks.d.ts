import { JWTPayload } from './types';
export declare class JWKSService {
    private client;
    constructor(jwksUri: string);
    private getKey;
    verifyToken(token: string, expectedAud: string, expectedIss: string): Promise<JWTPayload>;
}
