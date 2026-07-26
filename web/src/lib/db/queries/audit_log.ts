import { query } from '../pool';

export async function logEvent({ event_type, user_id = null, client_id = null, ip_address = null, user_agent = null, metadata = null }: {
  event_type: string;
  user_id?: string | null;
  client_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: any;
}) {
  try {
    await query(
      `INSERT INTO ica.audit_log (event_type, user_id, client_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event_type, user_id, client_id, ip_address, user_agent, metadata]
    );
  } catch (err) {
    console.error('Failed to write to audit log:', err);
  }
}

export async function getEventsForUser(userId: string, limit = 20) {
  const result = await query(
    `SELECT * FROM ica.audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function countRecentEvents({ eventType, ipAddress, sinceMinutes }: {
  eventType: string;
  ipAddress: string;
  sinceMinutes: number;
}) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM ica.audit_log
     WHERE event_type = $1 AND ip_address = $2::inet AND created_at > NOW() - ($3 || ' minutes')::interval`,
    [eventType, ipAddress, sinceMinutes]
  );
  return result.rows[0].count as number;
}
