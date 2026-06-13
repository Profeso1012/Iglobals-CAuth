import jwt from 'jsonwebtoken';
import { config } from './config';

export function signAccessToken({ sub, aud, scope, email, email_verified }: {
  sub: string;
  aud: string;
  scope: string;
  email: string;
  email_verified: boolean;
}) {
  return jwt.sign(
    { sub, aud, scope, email, email_verified },
    config.jwt.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: 900, // 15 mins
      issuer: config.baseUrl,
      keyid: config.jwt.kid,
    }
  );
}

export function signIdToken({ sub, aud, claims }: {
  sub: string;
  aud: string;
  claims: Record<string, any>;
}) {
  return jwt.sign(
    { sub, aud, ...claims },
    config.jwt.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: 3600, // 1 hour
      issuer: config.baseUrl,
      keyid: config.jwt.kid,
    }
  );
}

export function verifyToken(token: string, expectedAud: string) {
  return jwt.verify(token, config.jwt.publicKey, {
    algorithms: ['RS256'],
    audience: expectedAud,
    issuer: config.baseUrl,
  });
}

export function decodeTokenUnsafe(token: string) {
  return jwt.decode(token);
}
