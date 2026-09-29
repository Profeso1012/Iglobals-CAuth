# iGlobals Central Auth (ICA)

**OAuth 2.0 + OpenID Connect Authentication Server**

A production-ready, self-hosted authentication and identity management system built with Next.js, PostgreSQL, and TypeScript. Provides secure OAuth 2.0 authorization with PKCE, OpenID Connect flows, and SDKs for seamless integration.

## 🚀 Architecture

This is a **single Next.js application** that serves:
- **Frontend UI**: Login, registration, consent screens (`/auth/*`, `/dashboard`)
- **Backend API**: OAuth 2.0 endpoints, user management, admin portal (`/api/*`)
- **Database**: PostgreSQL for secure user and session storage
- **SDKs**: JavaScript/TypeScript and Python clients for easy integration

## 🔑 Features

### Authentication & Identity
- ✅ OAuth 2.0 Authorization Code Flow with PKCE
- ✅ OpenID Connect (OIDC) with ID Tokens
- ✅ Refresh Token Rotation with replay detection
- ✅ Email & Phone verification (OTP)
- ✅ Password reset flows
- ✅ Session management with secure cookies
- ✅ Multi-app SSO (Single Sign-On)
- ✅ JWKS endpoint for token verification

### Webhook Relay System 🆕
- ✅ Centralized Paystack webhook relay for all client apps
- ✅ Single Paystack account shared across ecosystem
- ✅ Automatic routing based on transaction metadata
- ✅ Per-client relay secrets with HMAC signature verification
- ✅ Webhook configuration via admin portal
- ✅ Secret rotation support

### Management & Monitoring
- ✅ Admin portal for managing users and OAuth clients
- ✅ Webhook configuration and secret management
- ✅ Audit logging for security events
- ✅ Client usage analytics
- ✅ Production-ready SDKs for Node.js and Python

## 📦 Deployment

### Single Deployment to Vercel

```bash
# 1. Install dependencies
cd web
npm install

# 2. Set environment variables (see .env.example)
# Add to Vercel dashboard or .env.local

# 3. Deploy
vercel deploy --prod
```

Your entire auth system runs at a **single URL**: `https://auth.yourdomain.com`

- Frontend: `https://auth.yourdomain.com/auth/login`
- API: `https://auth.yourdomain.com/api/oauth/token`
- Admin: `https://auth.yourdomain.com/admin` (see `CLIENT_REGISTRATION_GUIDE.md` for how to get admin access and what's there)

## 🛠️ Quick Start for Developers

Building a new app that needs ICA login and/or payments? [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md) has the full walkthrough - getting registered, env vars for *your* app, and the payment webhook setup. The SDK reference below covers the API surface itself.

### Using the JavaScript SDK

```bash
npm install @iglobals/auth-client
```

```typescript
import { ICAClient } from '@iglobals/auth-client';

// Initialize with your deployed URL
const client = new ICAClient({
  baseUrl: 'https://auth.yourdomain.com',  // Your single deployment URL
  clientId: 'your-app-id',
  clientSecret: 'your-app-secret',
  redirectUri: 'https://yourapp.com/callback',
  scopes: ['openid', 'profile', 'email']
});

// Start OAuth flow
const { codeVerifier, codeChallenge } = client.generatePKCE();
const state = crypto.randomUUID();
const authUrl = client.getAuthorizationUrl(state, codeChallenge);

// Redirect user to authUrl
window.location.href = authUrl;

// Handle callback
const code = new URLSearchParams(window.location.search).get('code');
const tokens = await client.exchangeCode(code, codeVerifier);

// Use tokens
const userInfo = await client.getUserInfo(tokens.access_token);
console.log(userInfo); // { sub, email, given_name, family_name, ... }
```

### Using the Python SDK

```bash
pip install iglobals-auth
```

```python
from iglobals_auth import IGlobalsAuth

# Initialize with your deployed URL
client = IGlobalsAuth(
    base_url='https://auth.yourdomain.com',  # Your single deployment URL
    client_id='your-app-id',
    client_secret='your-app-secret',
    redirect_uri='https://yourapp.com/callback',
    scopes=['openid', 'profile', 'email']
)

# Start OAuth flow
pkce = client.generate_pkce()
state = str(uuid.uuid4())
auth_url = client.get_authorization_url(state, pkce['code_challenge'])

# Redirect user to auth_url

# Handle callback
code = request.args.get('code')
tokens = client.exchange_code(code, pkce['code_verifier'])

# Use tokens
user_info = client.get_user_info(tokens.access_token)
print(user_info)  # UserInfoClaims object
```

## 🔐 Environment Variables

Create a `.env.local` file in the `web` directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ica_db

# JWT Keys (generate with: openssl genrsa -out private.pem 2048)
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
JWT_KID=unique-key-id

# Session
SESSION_SECRET=random-64-char-secret

# App
NEXT_PUBLIC_BASE_URL=https://auth.yourdomain.com
ICA_BASE_URL=https://auth.yourdomain.com

# Email (optional - for OTP verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# SMS (optional - for phone verification, via Kudisms)
KUDISMS_TOKEN=your-kudisms-token
KUDISMS_SENDER_ID=YourApp

# Google OAuth (optional - "Sign in with Google" on the login page)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin
ADMIN_JWT_SECRET=random-secret
ADMIN_SECRET=admin-panel-passphrase   # shared passphrase; admin access itself is an email allowlist - see CLIENT_REGISTRATION_GUIDE.md

# Payments (Paystack webhook relay - see CLIENT_REGISTRATION_GUIDE.md)
PAYSTACK_SECRET_KEY=sk_live_or_test_key
WEBHOOK_SECRET_ENCRYPTION_KEY=64-hex-chars   # generate with: openssl rand -hex 32
```

## 📚 SDK Documentation

### Installation

**JavaScript/TypeScript:**
```bash
npm install @iglobals/auth-client
```

**Python:**
```bash
pip install iglobals-auth
```

### Key Concepts

1. **baseUrl**: The URL where you deployed the Next.js app (e.g., `https://auth.yourdomain.com`)
2. **No hardcoding**: SDKs work with any deployment URL you provide
3. **Standard OAuth 2.0**: Compatible with any OAuth 2.0 compliant system

### JavaScript SDK API

```typescript
import { ICAClient, ICAMiddleware } from '@iglobals/auth-client';

// Client methods
const client = new ICAClient({ baseUrl, clientId, clientSecret, redirectUri });

client.getAuthorizationUrl(state, codeChallenge) // Returns auth URL
client.generatePKCE()                             // Generate PKCE pair
client.exchangeCode(code, codeVerifier)          // Exchange code for tokens
client.refreshAccessToken(refreshToken)          // Get new access token
client.getUserInfo(accessToken)                  // Fetch user profile
client.verifyToken(jwt)                          // Verify JWT signature
client.revokeToken(refreshToken)                 // Revoke refresh token

// Express middleware (protect routes)
app.use(ICAMiddleware({
  baseUrl: 'https://auth.yourdomain.com',
  clientId: 'your-app-id'
}));
```

### Python SDK API

```python
from iglobals_auth import IGlobalsAuth
from iglobals_auth.fastapi import ICAMiddleware  # Or .flask

# Client methods
client = IGlobalsAuth(base_url, client_id, client_secret, redirect_uri)

client.get_authorization_url(state, code_challenge)  # Returns auth URL
client.generate_pkce()                               # Generate PKCE pair
client.exchange_code(code, code_verifier)           # Exchange code for tokens
client.refresh_access_token(refresh_token)          # Get new access token
client.get_user_info(access_token)                  # Fetch user profile
client.verify_token(jwt_token)                      # Verify JWT signature
client.revoke_token(refresh_token)                  # Revoke refresh token

# FastAPI middleware (protect routes)
from fastapi import Depends

async def get_current_user(
    user = Depends(ICAMiddleware(base_url='https://auth.yourdomain.com'))
):
    return user
```

## 🪝 Webhook Relay System

ICA provides a centralized webhook relay for Paystack payments, allowing multiple client apps to share a single Paystack account while receiving their own webhook events.

### Quick Start

1. **Configure ICA with Paystack**
   ```bash
   # In ICA .env.local
   PAYSTACK_SECRET_KEY=sk_test_your_key
   WEBHOOK_SECRET_ENCRYPTION_KEY=64-hex-chars
   ```

2. **Set Paystack Webhook URL**
   - Dashboard: https://dashboard.paystack.com/settings/developer
   - Webhook URL: `https://your-ica.vercel.app/api/webhooks/paystack`

3. **Register Your App in ICA Admin Panel**
   - Go to: `https://your-ica.vercel.app/admin/clients/[your-client]`
   - Scroll to "Payment Webhooks" section
   - Enter your webhook URL: `https://yourapp.com/api/webhooks/ica-relay/paystack`
   - Save and copy the `relay_secret` (shown only once!)

4. **Implement Webhook Endpoint**
   ```python
   import hmac, hashlib
   
   @app.route('/api/webhooks/ica-relay/paystack', methods=['POST'])
   def ica_relay_paystack():
       # Verify signature
       relay_secret = os.environ['ICA_WEBHOOK_RELAY_SECRET'].encode()
       signature = request.headers.get('x-ica-relay-signature', '')
       computed = hmac.new(relay_secret, request.get_data(), hashlib.sha512).hexdigest()
       
       if not hmac.compare_digest(computed, signature):
           return jsonify({"error": "invalid signature"}), 401
       
       # Handle event
       payload = request.get_json()
       event = payload['event']  # 'charge.success', etc.
       data = payload['data']
       
       # Process payment...
       return jsonify({"received": True}), 200
   ```

5. **Tag Transactions with client_id**
   ```python
   # When initializing Paystack payment
   {
       "email": user_email,
       "amount": 50000,
       "metadata": {
           "client_id": "your_ica_client_id",  # ⚠️ REQUIRED for routing
           "purpose": "subscription"            # Optional: for your own routing
       }
   }
   ```

### Documentation

- **Admin how-to** (register a client, set up its webhook, rotate secrets): [CLIENT_REGISTRATION_GUIDE.md](./CLIENT_REGISTRATION_GUIDE.md)
- **Design document** (signature scheme, retry behavior, DB schema): [docs/PAYSTACK_WEBHOOK_RELAY.md](./docs/PAYSTACK_WEBHOOK_RELAY.md)
- **Test script**: `node scripts/test-webhook-relay.js`

## 🎯 How It Works

1. **Developer installs SDK** from npm/pip
2. **SDK initialized with baseUrl** pointing to your deployment
3. **All API calls go to `/api/*` routes** on your Next.js server
4. **No environment variable needed** in the SDK - just the runtime baseUrl

```
┌─────────────────────────────────────────┐
│   Your App (uses SDK)                   │
│   baseUrl: 'https://auth.yourdomain.com'│
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Next.js Server (auth.yourdomain.com)  │
│   ├── /api/oauth/token                  │
│   ├── /api/oauth/authorize              │
│   ├── /api/oauth/userinfo               │
│   ├── /api/oauth/jwks                   │
│   └── /auth/login (UI)                  │
└─────────────────────────────────────────┘
```

## SDK Publishing via GitHub Actions

This repository includes a GitHub Action (`.github/workflows/publish-sdks.yml`) that automatically publishes the JS and Python SDKs whenever you create a new **Release** on GitHub, or when you trigger it manually.

### How to set up publishing (One-time setup):

To allow GitHub to publish on your behalf, you need to create access tokens and save them as "Secrets" in your GitHub repository.

#### 1. Get your NPM Token (for JS SDK)
1. Go to [npmjs.com](https://www.npmjs.com/) and create an account if you don't have one.
2. Click your profile picture (top right) -> **Access Tokens**.
3. Click **Generate New Token** -> Choose **Classic Token** (or Granular).
4. Give it a name (e.g., "GitHub Actions iGlobals"), select **Publish** permissions, and generate it.
5. Copy the token (it starts with `npm_...`).

#### 2. Get your PyPI Token (for Python SDK)
1. Go to [pypi.org](https://pypi.org/) and create an account.
2. Click your profile name (top right) -> **Account settings**.
3. Scroll down to **API tokens** and click **Add API token**.
4. Give it a name, select scope **Entire account** (or specific project if created already), and generate it.
5. Copy the token (it starts with `pypi-...`).

#### 3. Add Tokens to GitHub
1. Go to this repository on GitHub.
2. Click **Settings** (the gear icon at the top).
3. On the left sidebar, scroll down to **Secrets and variables** -> **Actions**.
4. Click **New repository secret**.
5. Name: `NPM_TOKEN`, Secret: paste your npm token. Click Add.
6. Click **New repository secret** again.
7. Name: `PYPI_TOKEN`, Secret: paste your pypi token. Click Add.

### How to publish:
Once the secrets are added, the SDKs will automatically publish every time you publish a **Release** on GitHub. 
You can also trigger it manually by going to the **Actions** tab in GitHub, clicking **Publish SDKs**, and clicking **Run workflow**.