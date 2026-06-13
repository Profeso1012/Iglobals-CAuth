const crypto = require('crypto');
const config = require('../config');

// Using basic string parsing to get modulus and exponent from PEM is complex,
// so typically we'd use a library like 'node-jose' or 'pem-jwk'.
// For this design without extra deps, we'll implement a mock JWKS generator
// or use crypto's export capabilities.
// Node 16+ supports exporting to JWK natively.

let jwksCache = null;

function getJwks() {
  if (jwksCache) return jwksCache;

  const key = crypto.createPublicKey(config.jwt.publicKey);
  const jwk = key.export({ format: 'jwk' });

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

module.exports = {
  getJwks,
};
