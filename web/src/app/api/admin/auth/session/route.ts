import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';

// GET /api/admin/auth/session - Check admin session validity
export async function GET(req: NextRequest) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', error_description: 'Not authenticated' },
      { status: 401 }
    );
  }
  return NextResponse.json({ authenticated: true, email: session.email });
}
