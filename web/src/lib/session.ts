import { NextRequest, NextResponse } from 'next/server';
import { generateToken, sha256 } from './crypto';
import { createSession, getSessionByHash, revokeSession } from './db/queries/ica_sessions';

export async function createIcaSession(req: NextRequest, res: NextResponse, userId: string, rememberMe: boolean) {
  const token = generateToken(32);
  const hash = sha256(token);

  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  await createSession({
    token_hash: hash,
    user_id: userId,
    user_agent: userAgent,
    ip_address: ipAddress,
    remember_me: rememberMe,
  });

  // Set cookie on response
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // seconds
  res.cookies.set('ica_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  return token;
}

export async function readIcaSession(req: NextRequest) {
  const token = req.cookies.get('ica_session')?.value;
  if (!token) return null;

  const hash = sha256(token);
  const session = await getSessionByHash(hash);
  return session;
}

export async function destroyIcaSession(req: NextRequest, res: NextResponse) {
  const token = req.cookies.get('ica_session')?.value;
  if (token) {
    const hash = sha256(token);
    const session = await getSessionByHash(hash);
    if (session) {
      await revokeSession(session.id);
    }
  }
  
  // Clear cookie
  res.cookies.set('ica_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
