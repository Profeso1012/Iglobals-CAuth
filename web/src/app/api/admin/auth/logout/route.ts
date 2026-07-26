import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/lib/admin-session';

// POST /api/admin/auth/logout - Clear admin session
export async function POST() {
  const response = NextResponse.json({ success: true });
  destroyAdminSession(response);
  return response;
}
