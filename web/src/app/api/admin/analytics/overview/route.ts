import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import {
  getUserStats,
  getUserGrowth,
  getLoginActivity,
  getTopClientsByConsents,
  getActiveSessionsCount,
  getClientCounts,
} from '@/lib/db/queries/analytics';

// GET /api/admin/analytics/overview - Aggregate stats + series for the admin dashboard
export async function GET(req: NextRequest) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  const [userStats, growth, loginActivity, topClients, activeSessions, clientCounts] = await Promise.all([
    getUserStats(),
    getUserGrowth(30),
    getLoginActivity(30),
    getTopClientsByConsents(5),
    getActiveSessionsCount(),
    getClientCounts(),
  ]);

  return NextResponse.json({
    users: userStats,
    growth,
    login_activity: loginActivity,
    top_clients: topClients,
    active_sessions: activeSessions,
    clients: clientCounts,
  });
}
