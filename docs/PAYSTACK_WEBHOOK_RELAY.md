# Centralized Paystack Webhook Relay

Every IGLOBALS HUB client app shares **one** Paystack account (one CAC
registration, one merchant account) rather than each app registering its
own. That means Paystack can only be configured with **one** webhook URL for
the whole ecosystem - it has no idea which of the ~20 client apps a given
event belongs to.

ICA solves this: Paystack's dashboard points at ICA, ICA verifies the
signature once, works out which client app the event belongs to, and
forwards it there - re-signed with a secret unique to that app, not
Paystack's own secret.

This doc is what a client app needs to implement its side. It never touches
Paystack's raw secret key or its signature scheme - only ICA's.

## 1. Every Paystack call you make must tag `metadata.client_id`

When your app calls Paystack's `/transaction/initialize` (or passes
`metadata` to `PaystackPop.setup()` for the inline-popup flow), you **must**
include your own ICA `client_id`:

```json
{
  "metadata": {
    "client_id": "your-ica-client-id",
    "purpose": "subscription"
  }
}
```

Without `metadata.client_id`, ICA has no way to route the event back to you
- it will log the event as unroutable and drop it (Paystack still gets a
200, since retrying won't fix a missing field).

If your app has more than one kind of Paystack flow (e.g. a one-off
purchase AND a recurring subscription), also include a `purpose` string
(anything you choose, e.g. `"book_purchase"` vs `"subscription"`) so your
own webhook handler can tell them apart - ICA relays to a **single**
webhook URL per app, it does not fan out to multiple URLs for one client.

## 2. Register your webhook URL in the ICA admin panel

Go to **Settings > Clients > (your app) > Payment webhooks**, and enter the
URL on your own server that should receive relayed events, e.g.:

```
https://your-app.com/api/webhooks/ica-relay/paystack
```

The first time you save a URL for a given client, ICA generates a **relay
secret** and shows it to you exactly once - copy it now, it cannot be
retrieved again (only rotated, which invalidates the old one immediately).
Store it as an env var, e.g. `ICA_WEBHOOK_RELAY_SECRET`.

## 3. Verify the relay signature - not Paystack's

ICA forwards the **exact same raw JSON body** Paystack sent it, plus a new
header:

```
x-ica-relay-signature: <hex HMAC-SHA512 of the raw body, using YOUR relay secret>
```

Verify it exactly like you would Paystack's own signature, just with a
different header name and a different secret:

```python
import hmac, hashlib

signature = request.headers.get('x-ica-relay-signature', '')
computed = hmac.new(RELAY_SECRET.encode(), request.get_data(), hashlib.sha512).hexdigest()
if not hmac.compare_digest(computed, signature):
    return jsonify({"error": "invalid signature"}), 401
```

```javascript
const crypto = require('crypto');
const signature = req.headers['x-ica-relay-signature'];
const computed = crypto.createHmac('sha512', RELAY_SECRET).update(rawBody).digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
  return res.status(401).json({ error: 'invalid signature' });
}
```

**Never verify this against Paystack's own secret key** - your app doesn't
need to know it, and shouldn't. Only ICA holds the shared Paystack secret.

## 4. Everything else is identical to Paystack's own webhook docs

Once the signature checks out, the payload is byte-for-byte what Paystack
sent - same `event` field (`charge.success`, `subscription.create`,
`subscription.disable`, `invoice.payment_failed`, etc.), same `data` shape.
Process it exactly as Paystack's own documentation describes. Return `200`
quickly - ICA (and Paystack, further upstream) will retry on anything else.

## 5. Rotating secrets

- **Relay secret compromised or just rotating on schedule**: "Rotate relay
  secret" in the admin panel. Update your app's env var immediately after -
  requests will fail signature verification until you do.
- **Shared Paystack account key rotated**: that's `PAYSTACK_SECRET_KEY` in
  ICA's own env, not something any client app holds or needs to change.

## Reference implementations

- iTest: `app/billing/routes.py` (`webhook()`)
- iGlobal_edu: `ica_webhook_routes.py` (`ica_relay_paystack()`) - note this
  one demonstrates the multi-`purpose` dispatch pattern from section 1,
  since iGlobal_edu has two different Paystack flows sharing one webhook URL.
