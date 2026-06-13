import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { JWTPayload } from './types';
import { ICAError } from './errors';

export class JWKSService {
  private client: jwksClient.JwksClient;

  constructor(jwksUri: string) {
    this.client = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 3600000, // 1 hour
    });
  }

  private getKey = (header: JwtHeader, callback: SigningKeyCallback) => {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  };

  public verifyToken(token: string, expectedAud: string, expectedIss: string): Promise<JWTPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey,
        {
          audience: expectedAud,
          issuer: expectedIss,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            reject(new ICAError('invalid_token', err.message, 401));
          } else {
            resolve(decoded as JWTPayload);
          }
        }
      );
    });
  }
}
