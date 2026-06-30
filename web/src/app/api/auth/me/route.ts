import { NextRequest, NextResponse } from 'next/server';
import { readIcaSession } from '@/lib/session';
import { getUserById, updateUser } from '@/lib/db/queries/users';
import { logEvent } from '@/lib/db/queries/audit_log';
import { getClientIp } from '@/lib/api-helpers';

// GET /api/auth/me - Get current user info
export async function GET(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'not_found', error_description: 'User not found' },
        { status: 404 }
      );
    }

    // Return user without sensitive fields
    const { password_hash, ...userWithoutPassword } = user;
    return NextResponse.json({
      ...userWithoutPassword,
      has_password: !!password_hash // Include flag to indicate if password is set
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/me - Update current user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { first_name, last_name, phone } = body;

    // Only allow updating specific fields
    const updates: Record<string, any> = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) {
      updates.phone = phone;
      // If phone is changed, mark as unverified
      if (phone) updates.phone_verified = false;
    }

    const updatedUser = await updateUser(session.user_id, updates);

    await logEvent({
      event_type: 'user.profile.updated',
      user_id: session.user_id,
      ip_address: getClientIp(req),
      metadata: { fields: Object.keys(updates) }
    });

    const { password_hash, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}
