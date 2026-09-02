import { query } from '../pool';

export async function getWebhookConfig(clientId: string, provider: string) {
  const result = await query(
    `SELECT * FROM ica.client_webhook_configs WHERE client_id = $1 AND provider = $2`,
    [clientId, provider]
  );
  return result.rows[0] || null;
}

export async function upsertWebhookConfig(fields: {
  client_id: string;
  provider: string;
  webhook_url: string;
  relay_secret_encrypted: string;
}) {
  const { client_id, provider, webhook_url, relay_secret_encrypted } = fields;
  const result = await query(
    `INSERT INTO ica.client_webhook_configs (client_id, provider, webhook_url, relay_secret_encrypted)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (client_id, provider)
     DO UPDATE SET webhook_url = $3, relay_secret_encrypted = $4, updated_at = NOW()
     RETURNING *`,
    [client_id, provider, webhook_url, relay_secret_encrypted]
  );
  return result.rows[0];
}

/** URL-only update - does NOT touch the relay secret (see rotate-secret route for that). */
export async function updateWebhookUrl(clientId: string, provider: string, webhookUrl: string) {
  const result = await query(
    `UPDATE ica.client_webhook_configs SET webhook_url = $3, updated_at = NOW()
     WHERE client_id = $1 AND provider = $2 RETURNING *`,
    [clientId, provider, webhookUrl]
  );
  return result.rows[0] || null;
}

export async function rotateRelaySecret(clientId: string, provider: string, newEncryptedSecret: string) {
  const result = await query(
    `UPDATE ica.client_webhook_configs SET relay_secret_encrypted = $3, updated_at = NOW()
     WHERE client_id = $1 AND provider = $2 RETURNING *`,
    [clientId, provider, newEncryptedSecret]
  );
  return result.rows[0] || null;
}
