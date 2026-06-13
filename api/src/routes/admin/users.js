const { getUserById, setActive } = require('../../db/queries/users');
const { revokeAllUserSessions } = require('../../db/queries/ica_sessions');
const { revokeAllForUser } = require('../../db/queries/refresh_tokens');
const { logEvent } = require('../../db/queries/audit_log');

module.exports = async (req, res, next) => {
  try {
    const method = req.method;
    const { userId } = req.params || {};

    // GET /api/admin/users/:userId
    if (method === 'GET' && userId) {
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'not_found', error_description: 'User not found.', status: 404 });
      }
      const { password_hash: _omit, ...safeUser } = user;
      return res.json(safeUser);
    }

    // POST /api/admin/users/:userId/disable
    if (method === 'POST' && userId) {
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'not_found', error_description: 'User not found.', status: 404 });
      }

      await setActive(userId, false);
      // Revoke all active sessions and tokens for the disabled user
      await revokeAllUserSessions(userId);
      await revokeAllForUser(userId);
      await logEvent({ event_type: 'admin.user.disabled', user_id: userId, metadata: { admin: req.adminUser?.role } });

      return res.json({ disabled: true });
    }

  } catch (err) {
    next(err);
  }
};
