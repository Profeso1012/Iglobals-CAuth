const { readIcaSession } = require('../lib/session');
const { getUserById } = require('../db/queries/users');

async function requireIcaSession(req, res, next) {
  try {
    const session = await readIcaSession(req);
    if (!session) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Valid session required',
        status: 401,
      });
    }

    const user = await getUserById(session.user_id);
    if (!user || !user.is_active) {
      return res.status(403).json({
        error: 'account_disabled',
        error_description: 'This account has been disabled.',
        status: 403,
      });
    }

    req.sessionUser = user;
    req.icaSessionId = session.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireIcaSession;
