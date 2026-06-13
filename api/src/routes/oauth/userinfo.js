const { verifyToken } = require('../../lib/jwt');
const { getUserById } = require('../../db/queries/users');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized', error_description: 'Bearer token missing or malformed.', status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      // Userinfo usually doesn't strictly verify audience because the resource server might be separate.
      // But we can decode or verify it if we have the public key.
      payload = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'token_expired', error_description: 'Access token has expired.', status: 401 });
      }
      return res.status(401).json({ error: 'unauthorized', error_description: 'Invalid token.', status: 401 });
    }

    const user = await getUserById(payload.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'unauthorized', error_description: 'User not found or inactive.', status: 401 });
    }

    const scopes = payload.scope ? payload.scope.split(' ') : [];
    const userInfo = {
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

    res.json(userInfo);

  } catch (err) {
    next(err);
  }
};
