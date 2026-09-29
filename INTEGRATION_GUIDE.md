# Integrating a New App with ICA

This is the guide for **developers building a new app** ("iPod") that needs login and/or payments via iGlobals Central Auth. If you're the one administering ICA itself - registering apps, editing them, configuring webhooks - see [`CLIENT_REGISTRATION_GUIDE.md`](./CLIENT_REGISTRATION_GUIDE.md) instead; that's the admin-side doc.

## 0. Get registered

Before writing any code, an ICA admin needs to register your app and hand you a `client_id` and `client_secret` (see `CLIENT_REGISTRATION_GUIDE.md`, section 3, from their side). You'll need to tell them your app's redirect URI(s) up front (e.g. `http://localhost:5000/auth/callback` for local dev).

## 1. Install the SDK

```bash
npm install @iglobals/auth-client      # Node/TypeScript
pip install iglobals-auth              # Python
```

## 2. Add these to your app's own `.env`

```env
ICA_BASE_URL=http://localhost:3000        # or the deployed ICA URL
ICA_CLIENT_ID=your-client-id              # from step 0
ICA_CLIENT_SECRET=your-client-secret      # from step 0 - keep this server-side only, never in frontend code
ICA_REDIRECT_URI=http://localhost:5000/auth/callback   # must exactly match a URI your admin registered for you
```

These are **your app's** env vars, not ICA's own - they don't go in ICA's `.env`, they go in your app's.

## 3. Implement login

**Python (Flask example):**
```python
from iglobals_auth import IGlobalsAuth
import os, uuid

client = IGlobalsAuth(
    base_url=os.environ['ICA_BASE_URL'],
    client_id=os.environ['ICA_CLIENT_ID'],
    client_secret=os.environ['ICA_CLIENT_SECRET'],
    redirect_uri=os.environ['ICA_REDIRECT_URI'],
    scopes=['openid', 'profile', 'email'],
)

@app.route('/auth/login')
def login():
    pkce = client.generate_pkce()
    state = str(uuid.uuid4())
    session['pkce_verifier'] = pkce['code_verifier']  # needed again in the callback
    session['oauth_state'] = state
    return redirect(client.get_authorization_url(state, pkce['code_challenge']))

@app.route('/auth/callback')
def callback():
    if request.args.get('state') != session.pop('oauth_state', None):
        abort(400, 'state mismatch')
    tokens = client.exchange_code(request.args['code'], session.pop('pkce_verifier'))
    user_info = client.get_user_info(tokens.access_token)
    # user_info.sub is the stable identity - key your own User table off this,
    # not email (see iGlobal_edu's auth_routes.py sync_user() for a worked example
    # of first-login account creation + safe email-conflict handling)
    ...
```

**JavaScript/TypeScript** follows the same shape with `ICAClient` - see the root [`README.md`](./README.md)'s SDK section for the exact calls, or `ICAMiddleware` if you just want to protect Express routes without hand-rolling the flow.

## 4. If you need payments

ICA relays Paystack webhooks to your app from one shared Paystack account - you don't need your own Paystack account or webhook URL registered with Paystack directly.

1. Ask your ICA admin to set up your webhook relay (`CLIENT_REGISTRATION_GUIDE.md`, section 6) - they'll give you an `ICA_WEBHOOK_RELAY_SECRET` once, add it to your `.env`.
2. Tag every Paystack transaction you initialize with your `client_id`:
   ```python
   {
     "email": user_email,
     "amount": 50000,
     "metadata": {
       "client_id": "your-client-id",   # required - this is how ICA knows the event is yours
       "purpose": "subscription"         # optional, for your own internal routing
     }
   }
   ```
3. Implement your receiving endpoint (the exact URL you gave the admin in step 1), verifying `x-ica-relay-signature` against your `ICA_WEBHOOK_RELAY_SECRET` (HMAC-SHA512) - **not** Paystack's own webhook secret, which ICA never shares with client apps:
   ```python
   import hmac, hashlib

   @app.route('/api/webhooks/ica-relay/paystack', methods=['POST'])
   def ica_relay_paystack():
       secret = os.environ['ICA_WEBHOOK_RELAY_SECRET'].encode()
       signature = request.headers.get('x-ica-relay-signature', '')
       computed = hmac.new(secret, request.get_data(), hashlib.sha512).hexdigest()
       if not hmac.compare_digest(computed, signature):
           return jsonify({"error": "invalid signature"}), 401

       payload = request.get_json()
       event = payload['event']  # 'charge.success', 'subscription.disable', etc.
       # handle it...
       return jsonify({"received": True}), 200
   ```
   See `app/billing/routes.py` in iTest or `ica_webhook_routes.py` in iGlobal_edu for complete working implementations, or `docs/PAYSTACK_WEBHOOK_RELAY.md` for the full signature/retry design.

## 5. Testing the full loop

1. Start your app, hit `/auth/login`, confirm you land on ICA's login page.
2. Log in, consent, confirm you're redirected back to your callback with a `code`.
3. Confirm the code exchange succeeds and `user_info.sub` comes back.
4. If testing payments: initialize a test transaction with `client_id` in metadata, complete it with a Paystack test card, confirm your webhook endpoint receives and verifies the relayed event.

## Troubleshooting

**`redirect_uri_mismatch`** - your `ICA_REDIRECT_URI` doesn't exactly match what's registered for your `client_id` (protocol/host/port/path all count). Ask your admin to check via `GET /api/admin/clients/[clientId]`, or see `OAUTH_FLOW_EXPLAINED.md`'s section on this.

**Webhook events never arrive** - see the Troubleshooting section in `CLIENT_REGISTRATION_GUIDE.md`; the most common cause is `client_id` missing from the Paystack transaction's `metadata`.

## See Also

- [`README.md`](./README.md) - full SDK API reference
- [`OAUTH_FLOW_EXPLAINED.md`](./OAUTH_FLOW_EXPLAINED.md) - OAuth 2.0 + PKCE mechanics in depth
- [`docs/PAYSTACK_WEBHOOK_RELAY.md`](./docs/PAYSTACK_WEBHOOK_RELAY.md) - webhook relay internals
- [`CLIENT_REGISTRATION_GUIDE.md`](./CLIENT_REGISTRATION_GUIDE.md) - the admin-side doc for getting registered in the first place
