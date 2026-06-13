import crypto from 'crypto';
import { config } from './config';

let jwksCache: any = null;

export function getJwks() {
  if (jwksCache) return jwksCache;

  const key = crypto.createPublicKey(config.jwt.publicKey);
  const jwk = key.export({ format: 'jwk' }) as any;

  jwksCache = {
    keys: [
      {
        kty: jwk.kty,
        use: 'sig',
        kid: config.jwt.kid,
        alg: 'RS256',
        n: jwk.n,
        e: jwk.e,
      }
    ]
  };

  return jwksCache;
}
