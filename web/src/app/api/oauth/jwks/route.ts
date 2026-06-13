import { NextResponse } from 'next/server';
import { getJwks } from '@/lib/jwks';

export async function GET() {
  const response = NextResponse.json(getJwks());
  response.headers.set('Cache-Control', 'public, max-age=3600');
  return response;
}
