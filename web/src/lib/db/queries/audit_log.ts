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
