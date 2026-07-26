import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { config } from './config';

const COOKIE_NAME = 'ica_admin_session';
const EXPIRES_IN_SECONDS = 12 * 60 * 60; // 12 hours

export function createAdminSession(res: NextResponse, email: string) {
  const token = jwt.sign({ role: 'admin', email }, config.adminJwtSecret, {
    expiresIn: EXPIRES_IN_SECONDS,
  });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRES_IN_SECONDS,
  });

  return token;
}

export async function readAdminSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, config.adminJwtSecret) as { role: string; email?: string };
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

export function destroyAdminSession(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
