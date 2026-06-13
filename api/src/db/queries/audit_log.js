const db = require('../pool');

async function logEvent({ event_type, user_id = null, client_id = null, ip_address = null, user_agent = null, metadata = null }) {
  try {
    await db.query(
      `INSERT INTO ica.audit_log (event_type, user_id, client_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event_type, user_id, client_id, ip_address, user_agent, metadata]
    );
  } catch (err) {
    console.error('Failed to write to audit log:', err);
  }
}

module.exports = {
  logEvent,
};
