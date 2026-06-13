const { destroyIcaSession } = require('../../lib/session');
const { revokeAllForUser } = require('../../db/queries/refresh_tokens');
const { revokeAllUserSessions } = require('../../db/queries/ica_sessions');
const { logEvent } = require('../../db/queries/audit_log');

module.exports = async (req, res, next) => {
  try {
    const { global } = req.body;
    const user = req.sessionUser;

    if (global) {
      await revokeAllUserSessions(user.id);
      await revokeAllForUser(user.id);
    } else {
      await destroyIcaSession(req, res);
    }

    await logEvent({ event_type: 'user.logout', user_id: user.id, ip_address: req.ip });

    return res.json({ logged_out: true });
  } catch (err) {
    next(err);
  }
};
