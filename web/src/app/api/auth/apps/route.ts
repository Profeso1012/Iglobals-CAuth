import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { listConsentsForUser } from '@/lib/db/queries/user_consents';

// GET /api/auth/apps - List user authorized apps
export async function GET(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const consents = await listConsentsForUser(session.user_id);
    
    // Format for frontend
    const apps = consents.map((c: any) => ({
      client_id: c.client_id,
      name: c.name,
      logo_url: c.logo_url,
      scopes: c.scopes,
      granted_at: c.granted_at
    }));

    return NextResponse.json({ apps });
  } catch (error) {
    console.error('List apps error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
