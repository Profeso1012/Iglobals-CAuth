const { listUserSessions, revokeSession } = require('../../db/queries/ica_sessions');
const { logEvent } = require('../../db/queries/audit_log');

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;

    // GET /api/auth/sessions
    if (req.method === 'GET') {
      const sessions = await listUserSessions(user.id);
      const result = sessions.map(s => ({
        id: s.id,
        user_agent: s.user_agent,
        ip_address: s.ip_address,
        created_at: s.created_at,
        last_active_at: s.last_active_at,
        current: s.id === req.icaSessionId,
      }));
      return res.json({ sessions: result });
    }

    // DELETE /api/auth/sessions/:sessionId
    if (req.method === 'DELETE') {
      const { sessionId } = req.params;
      const sessions = await listUserSessions(user.id);
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        return res.status(404).json({ error: 'session_not_found', error_description: 'Session not found.', status: 404 });
      }

      await revokeSession(session.id);
      await logEvent({ event_type: 'user.session.revoked', user_id: user.id, metadata: { session_id: sessionId }, ip_address: req.ip });
      return res.json({ revoked: true });
    }
  } catch (err) {
    next(err);
  }
};
