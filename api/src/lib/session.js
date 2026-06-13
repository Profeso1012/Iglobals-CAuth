const { generateToken, sha256 } = require('./crypto');
const { createSession, getSessionByHash, revokeSession } = require('../db/queries/ica_sessions');

async function createIcaSession(req, res, userId, rememberMe) {
  const token = generateToken(32);
  const hash = sha256(token);

  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'unknown';

  await createSession({
    token_hash: hash,
    user_id: userId,
    user_agent: userAgent,
    ip_address: ipAddress,
    remember_me: rememberMe,
  });

  setCookie(res, token, rememberMe);
  return token;
}

async function readIcaSession(req) {
  const token = req.cookies?.ica_session;
  if (!token) return null;

  const hash = sha256(token);
  const session = await getSessionByHash(hash);
  return session;
}

async function destroyIcaSession(req, res) {
  const token = req.cookies?.ica_session;
  if (token) {
    const hash = sha256(token);
    const session = await getSessionByHash(hash);
    if (session) {
      await revokeSession(session.id);
    }
  }
  clearCookie(res);
}

function setCookie(res, token, rememberMe) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('ica_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

function clearCookie(res) {
  res.cookie('ica_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

module.exports = {
  createIcaSession,
  readIcaSession,
  destroyIcaSession,
  setCookie,
  clearCookie,
};
