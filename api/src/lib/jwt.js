const jwt = require('jsonwebtoken');
const config = require('../config');

function signAccessToken({ sub, aud, scope, email, email_verified }) {
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

function signIdToken({ sub, aud, claims }) {
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

function verifyToken(token, expectedAud) {
  return jwt.verify(token, config.jwt.publicKey, {
    algorithms: ['RS256'],
    audience: expectedAud,
    issuer: config.baseUrl,
  });
}

function decodeTokenUnsafe(token) {
  return jwt.decode(token);
}

module.exports = {
  signAccessToken,
  signIdToken,
  verifyToken,
  decodeTokenUnsafe,
};
