import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from './session';

export async function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function errorResponse(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

export async function parseBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function requireSession(req: NextRequest) {
  const session = await readIcaSession(req);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export function getClientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
}

export function getUserAgent(req: NextRequest) {
  return req.headers.get('user-agent') || 'unknown';
}
