import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { listUsers } from '@/lib/db/queries/users';

// GET /api/admin/users?q=&status=active|suspended&verified=email|email_pending|phone|phone_pending&page=&limit=
export async function GET(req: NextRequest) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') || undefined;
  const status = (searchParams.get('status') as 'active' | 'suspended' | null) || undefined;
  const verified = (searchParams.get('verified') as 'email' | 'email_pending' | 'phone' | 'phone_pending' | null) || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  const { rows, total } = await listUsers({ search, status, verified, page, limit });

  return NextResponse.json({ users: rows, total, page, limit });
}
