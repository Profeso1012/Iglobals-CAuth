import { query } from '../pool';

export async function getUserStats() {
  const result = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_active)::int AS active,
      COUNT(*) FILTER (WHERE NOT is_active)::int AS suspended,
      COUNT(*) FILTER (WHERE email_verified)::int AS email_verified,
      COUNT(*) FILTER (WHERE phone_verified)::int AS phone_verified,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day')::int AS signups_today
    FROM ica.users
  `);
  return result.rows[0];
}

export async function getUserGrowth(days = 30) {
  const result = await query(
    `SELECT date_trunc('day', created_at)::date AS date, COUNT(*)::int AS count
     FROM ica.users
     WHERE created_at > NOW() - ($1 || ' days')::interval
     GROUP BY date ORDER BY date ASC`,
    [days]
  );
  return result.rows;
}

export async function getLoginActivity(days = 30) {
  const result = await query(
    `SELECT date_trunc('day', created_at)::date AS date, event_type, COUNT(*)::int AS count
     FROM ica.audit_log
     WHERE event_type IN ('auth.login.success', 'auth.login.failed')
       AND created_at > NOW() - ($1 || ' days')::interval
     GROUP BY date, event_type ORDER BY date ASC`,
    [days]
  );
  return result.rows;
}

export async function getTopClientsByConsents(limit = 5) {
  const result = await query(
    `SELECT cl.client_id, cl.name, cl.logo_url, COUNT(uc.*)::int AS active_users
     FROM ica.oauth_clients cl
     LEFT JOIN ica.user_consents uc ON uc.client_id = cl.client_id AND uc.revoked_at IS NULL
     GROUP BY cl.client_id, cl.name, cl.logo_url
     ORDER BY active_users DESC, cl.name ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getActiveSessionsCount() {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM ica.ica_sessions WHERE revoked_at IS NULL AND expires_at > NOW()`
  );
  return result.rows[0].count as number;
}

export async function getClientCounts() {
  const result = await query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM ica.oauth_clients`
  );
  return result.rows[0];
}

export async function getClientUsage(clientId: string) {
  const [consents, tokenExchanges] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS active_consents FROM ica.user_consents WHERE client_id = $1 AND revoked_at IS NULL`,
      [clientId]
    ),
    query(
      `SELECT COUNT(*)::int AS count FROM ica.audit_log
       WHERE client_id = $1 AND event_type = 'oauth.code.exchanged' AND created_at > NOW() - INTERVAL '30 days'`,
      [clientId]
    ),
  ]);
  return {
    active_consents: consents.rows[0].active_consents,
    token_exchanges_30d: tokenExchanges.rows[0].count,
  };
}
