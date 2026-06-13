import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { getUserById } from '@/lib/db/queries/users';
import { json, errorResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('unauthorized', 'Bearer token missing or malformed.', 401);
    }

    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = verifyToken(token, ''); // Userinfo doesn't strictly verify audience
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse('token_expired', 'Access token has expired.', 401);
      }
      return errorResponse('unauthorized', 'Invalid token.', 401);
    }

    const user = await getUserById(payload.sub);
    if (!user || !user.is_active) {
      return errorResponse('unauthorized', 'User not found or inactive.', 401);
    }

    const scopes = payload.scope ? payload.scope.split(' ') : [];
    const userInfo: any = {
      sub: user.id,
    };

    if (scopes.includes('profile')) {
      userInfo.given_name = user.first_name;
      userInfo.family_name = user.last_name;
    }
    if (scopes.includes('email')) {
      userInfo.email = user.email;
      userInfo.email_verified = user.email_verified;
    }
    if (scopes.includes('phone')) {
      userInfo.phone_number = user.phone;
      userInfo.phone_number_verified = user.phone_verified;
    }
    if (scopes.includes('address')) {
      userInfo.address = {
        street_address: [user.address_line1, user.address_line2].filter(Boolean).join(', '),
        locality: user.city,
        region: user.state,
        postal_code: user.postal_code,
        country: user.country,
      };
    }

    return json(userInfo);
  } catch (err) {
    console.error('Userinfo endpoint error:', err);
    return errorResponse('server_error', 'Internal server error', 500);
  }
}
