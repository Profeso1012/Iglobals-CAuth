import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { config } from '@/lib/config';
import { json } from '@/lib/api-helpers';
import { getWebhookConfig } from '@/lib/db/queries/client_webhook_configs';
import { decryptSecret } from '@/lib/crypto';
import { logEvent } from '@/lib/db/queries/audit_log';

const PROVIDER = 'paystack';

/**
 * Receives Paystack webhooks once, for every client app sharing the one
 * IGLOBALS HUB Paystack account, and relays each event to whichever app it
 * belongs to.
 *
 * Routing: since one Paystack account produces events for many apps, every
 * app MUST include its own ICA client_id in the transaction's `metadata`
 * when it calls Paystack's initialize endpoint (metadata.client_id). That's
 * the only way this route knows who an event is for - see the integration
 * guide (docs/PAYSTACK_WEBHOOK_RELAY.md).
 *
 * Signature: verifies Paystack's real x-paystack-signature once here, then
 * re-signs the same raw body with a secret unique to the ICA<->client-app
 * relationship before forwarding - client apps never need Paystack's own
 * secret, only their own relay secret (given once, at webhook setup, in the
 * admin panel).
 *
 * Always returns 200 to Paystack once a relay attempt has been made
 * (success or failure) - a downstream client app being slow/down is not
 * something Paystack retrying THIS endpoint can fix, and would otherwise
 * cause Paystack to keep re-delivering the same event indefinitely.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', config.paystackSecretKey).update(rawBody).digest('hex');
  if (!timingSafeEqual(expected, signature)) {
    console.warn('Rejected Paystack webhook: invalid signature');
    return json({ error: 'invalid_signature' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const clientId = payload?.data?.metadata?.client_id;
  if (!clientId) {
    console.error('Paystack webhook has no metadata.client_id - cannot route it', { event: payload?.event, reference: payload?.data?.reference });
    await logEvent({ event_type: 'webhook.paystack.unroutable', metadata: { event: payload?.event, reference: payload?.data?.reference } });
    return json({ received: true }); // not Paystack's fault - ack anyway, nothing to retry into
  }

  const webhookConfig = await getWebhookConfig(clientId, PROVIDER);
  if (!webhookConfig || !webhookConfig.is_active) {
    console.error(`No active Paystack webhook configured for client_id=${clientId}`);
    await logEvent({ event_type: 'webhook.paystack.no_config', client_id: clientId, metadata: { event: payload?.event } });
    return json({ received: true });
  }

  const relaySecret = decryptSecret(webhookConfig.relay_secret_encrypted);
  const relaySignature = crypto.createHmac('sha512', relaySecret).update(rawBody).digest('hex');

  const delivered = await relayWithRetry(webhookConfig.webhook_url, rawBody, relaySignature);

  await logEvent({
    event_type: delivered ? 'webhook.paystack.relayed' : 'webhook.paystack.relay_failed',
    client_id: clientId,
    metadata: { event: payload?.event, reference: payload?.data?.reference, webhook_url: webhookConfig.webhook_url },
  });

  return json({ received: true });
}

async function relayWithRetry(webhookUrl: string, rawBody: string, signature: string, attempts = 2): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ica-relay-signature': signature,
          'x-ica-relay-provider': PROVIDER,
        },
        body: rawBody,
      });
      if (res.ok) return true;
      console.error(`Relay to ${webhookUrl} returned ${res.status} (attempt ${i + 1}/${attempts})`);
    } catch (err) {
      console.error(`Relay to ${webhookUrl} failed (attempt ${i + 1}/${attempts}):`, err);
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
