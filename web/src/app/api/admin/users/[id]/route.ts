import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-session';
import { getUserById, getUserByEmail, updateUser } from '@/lib/db/queries/users';
import { listUserSessions } from '@/lib/db/queries/ica_sessions';
import { listConsentsForUser } from '@/lib/db/queries/user_consents';
import { getEventsForUser, logEvent } from '@/lib/db/queries/audit_log';
import { validate, adminUpdateUserSchema } from '@/lib/validation';
import { getClientIp } from '@/lib/api-helpers';

interface AdminUpdateUserInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  is_active?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
}

function sanitize(user: Record<string, unknown>) {
  const { password_hash: _password_hash, ...safe } = user;
  return safe;
}

// GET /api/admin/users/:id - Get user detail (profile + sessions + apps + activity)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: 'not_found', error_description: 'User not found' }, { status: 404 });
  }

  const [sessions, apps, activity] = await Promise.all([
    listUserSessions(id),
    listConsentsForUser(id),
    getEventsForUser(id, 20),
  ]);

  return NextResponse.json({
    user: sanitize(user),
    sessions,
    apps,
    activity,
  });
}

// PATCH /api/admin/users/:id - Update user profile / status / verification flags
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getUserById(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found', error_description: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { value, error } = validate<AdminUpdateUserInput>(adminUpdateUserSchema, body);
    if (error) {
      return NextResponse.json({ error: 'invalid_request', error_description: error.message }, { status: 400 });
    }

    if (value.email && value.email !== existing.email) {
      const emailTaken = await getUserByEmail(value.email);
      if (emailTaken) {
        return NextResponse.json(
          { error: 'email_taken', error_description: 'Another user already uses this email' },
          { status: 409 }
        );
      }
    }

    const updated = await updateUser(id, value);

    await logEvent({
      event_type: 'admin.user.updated',
      user_id: id,
      ip_address: getClientIp(req),
      metadata: { fields: Object.keys(value) },
    });

    return NextResponse.json({ user: sanitize(updated) });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'server_error', error_description: 'Internal server error' }, { status: 500 });
  }
}
