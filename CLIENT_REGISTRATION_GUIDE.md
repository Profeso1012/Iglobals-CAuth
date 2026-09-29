# ICA Admin Guide: Registering & Managing Client Apps

This is the guide for whoever administers ICA itself — registering a new app (iTest, iGlobal_edu, or anything new) as an OAuth client, editing an existing one, and setting up its payment webhook relay. It reflects the real admin panel and admin API as they exist today, not the manual-SQL-only approach from ICA's early days.

For the deeper technical design of the webhook relay (signature scheme, retry behavior, DB tables), see [`docs/PAYSTACK_WEBHOOK_RELAY.md`](./docs/PAYSTACK_WEBHOOK_RELAY.md). For the OAuth/PKCE mechanics, see [`OAUTH_FLOW_EXPLAINED.md`](./OAUTH_FLOW_EXPLAINED.md).

---

## 1. Getting Admin Access

Admin access is an explicit email allowlist (`ica.admin_emails`) — there's no self-serve signup. To make someone an admin:

```bash
node scripts/add-admin-email.js newdev@example.com
```

This needs `DATABASE_URL` set (same one the app uses) and is safe to re-run — it won't error if the email's already an admin.

## 2. Logging Into the Admin Panel

Go to `/admin/login`. Login is two steps:

1. Enter the shared **admin passphrase** (the `ADMIN_SECRET` env var — same for every admin) and your email (must already be on the allowlist above). This sends a one-time code to that email.
2. Enter the code. You're now signed in — the panel is at `/admin`, with three sections: **Overview**, **Clients**, **Users**. (Some older docs mention a "Settings" section — it doesn't exist; webhook config lives inside each client's own page.)

If you're scripting against the admin API directly instead of using the UI, the same two steps apply via curl, using a cookie jar to carry the session between requests:

```bash
curl -c cookies.txt -X POST https://your-ica.example.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"secret": "the-ADMIN_SECRET-value", "email": "you@example.com"}'

# check your email for the code, then:
curl -b cookies.txt -c cookies.txt -X POST https://your-ica.example.com/api/admin/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "otp": "123456"}'

# cookies.txt now holds a valid admin session for subsequent requests:
curl -b cookies.txt https://your-ica.example.com/api/admin/clients
```

## 3. Registering a New Client App

**Via the UI (normal path):** `/admin/clients` → **Create client**. Fill in the app name, an optional description and logo URL, and at least one redirect URI. Submit, and the client secret is shown **exactly once** — copy it immediately into the new app's `.env` as `ICA_CLIENT_SECRET`; ICA never stores or displays the plaintext again, only a bcrypt hash.

Once created, hand the `client_id` and `client_secret` to whoever is building that app - point them at [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md), which covers the SDK, their env vars, and payment webhook setup from their side.

**Via the API** (for scripting a new app's setup):

```bash
curl -b cookies.txt -X POST https://your-ica.example.com/api/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "my-new-app",
    "name": "My New Application",
    "description": "Optional description",
    "logo_url": "https://cdn.myapp.com/logo.png",
    "redirect_uris": ["https://myapp.com/auth/callback"],
    "allowed_scopes": ["openid", "profile", "email"]
  }'
```

Response includes `client_secret` once — same one-time-reveal rule as the UI. Notes on the fields:
- `client_id`: lowercase letters/digits/`_`/`-` only, 3–64 chars, must be unique.
- `redirect_uris`: at least one full URL required; can hold several (web + mobile + local dev).
- `allowed_scopes`: defaults to `["openid", "profile", "email"]` if omitted.
- You do **not** send a `client_secret` — the server always generates it. (Older docs showed a payload with a client-supplied secret; that was never actually how the API works.)

## 4. Editing an Existing Client

`/admin/clients/[clientId]` (UI) or `PATCH /api/admin/clients/[clientId]` (API) — update any of `name`, `description`, `logo_url`, `redirect_uris`, `allowed_scopes`, `is_active`. Send only the fields you're changing:

```bash
curl -b cookies.txt -X PATCH https://your-ica.example.com/api/admin/clients/my-new-app \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["https://myapp.com/auth/callback", "https://myapp.com/auth/callback-mobile"]}'
```

Setting `is_active: false` disables the client (it can no longer complete OAuth) without deleting it. Changes take effect immediately.

## 5. Rotating a Client Secret

If a secret leaks or you're just rotating on schedule:

```bash
curl -b cookies.txt -X POST https://your-ica.example.com/api/admin/clients/my-new-app/rotate-secret
```

Returns the new plaintext secret once — update the client app's `ICA_CLIENT_SECRET` immediately, since the old one stops working right away.

## 6. Setting Up Payment Webhooks for a Client

This is how a client app (iTest, iGlobal_edu, etc.) gets Paystack webhook events, without needing its own Paystack account — ICA holds one shared Paystack account and relays events to whichever client the transaction belongs to.

On the client app's page (`/admin/clients/[clientId]`, "Payment Webhooks" section), or via API:

```bash
curl -b cookies.txt -X POST https://your-ica.example.com/api/admin/clients/my-new-app/webhooks \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://myapp.com/api/webhooks/ica-relay/paystack"}'
```

The **first** call for a client generates its `relay_secret` and returns it once — save it as that app's `ICA_WEBHOOK_RELAY_SECRET`. Calling this again later just updates the URL and leaves the existing secret alone; use the dedicated rotate endpoint to get a new one:

```bash
curl -b cookies.txt -X POST https://your-ica.example.com/api/admin/clients/my-new-app/webhooks/rotate-secret
```

**For this to actually route events to the right app**, the client app must tag every Paystack transaction it initializes with its own `client_id` in the metadata:

```python
{
  "email": user_email,
  "amount": 50000,
  "metadata": {
    "client_id": "my-new-app",   # required - this is how ICA knows where to relay the event
    "purpose": "subscription"     # optional, for the app's own internal routing (e.g. iGlobal_edu splits "subscription" vs "book_purchase")
  }
}
```

And the client app's receiving endpoint must verify `x-ica-relay-signature` (HMAC-SHA512, keyed with its own `ICA_WEBHOOK_RELAY_SECRET` — **not** Paystack's raw secret, which ICA never shares) before trusting the payload. See `app/billing/routes.py` in iTest or `ica_webhook_routes.py` in iGlobal_edu for working reference implementations, or the full walkthrough in `docs/PAYSTACK_WEBHOOK_RELAY.md`.

This whole relay setup only needs doing once per client, per environment (once for local/staging, once for production, since the URLs differ).

## 7. Client Logo Requirements

Shown on the consent screen when a user authorizes the app. ICA doesn't host logos — the client app hosts its own.

- PNG/JPG/SVG, ideally 512×512px (displayed at 56×56px, in a circle)
- Must be publicly reachable over **HTTPS** (localhost/HTTP URLs won't render for real users)
- Under ~200KB is plenty

If a logo isn't showing: confirm it opens directly in a browser, check for CORS errors in devtools, and verify what's actually saved with `GET /api/admin/clients/[clientId]` (or just look at the client's edit page).

## 8. Troubleshooting

**"Client not found" on the consent screen** — the `client_id` the app is sending doesn't match any row in `ica.oauth_clients`, or the client was set `is_active: false`. Check via `/admin/clients` or `GET /api/admin/clients/[clientId]`.

**"Invalid client credentials" during token exchange** — the app's `ICA_CLIENT_SECRET` doesn't match. Since the plaintext is only ever shown once (at creation or rotation), if it was lost, rotate it and update the app's env immediately.

**Webhook events never arrive at the client app** — check, in order: (1) is `client_id` actually present in the Paystack transaction's `metadata`, exactly matching the registered `client_id`; (2) does the client have an active `client_webhook_configs` row (`GET /api/admin/clients/[clientId]/webhooks`); (3) is the client's endpoint verifying against the *relay* secret, not Paystack's own webhook secret — these are two different secrets.

---

## See Also

- [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md) — hand this to the app developer once you've registered them
- [`docs/PAYSTACK_WEBHOOK_RELAY.md`](./docs/PAYSTACK_WEBHOOK_RELAY.md) — webhook relay internals
- [`OAUTH_FLOW_EXPLAINED.md`](./OAUTH_FLOW_EXPLAINED.md) — OAuth 2.0 + PKCE flow in detail
- [`sdk-py/README.md`](./sdk-py/README.md) / [`sdk-js/README.md`](./sdk-js/README.md) — SDK usage for the app being registered
