# iGlobals Central Auth (ICA) - Integration Guide

Welcome to the **iGlobals Central Auth** integration guide. This document explains how the authentication service works, how to deploy it, and how to integrate it into any new or existing application.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Deployment](#deployment)
3. [Registering a Client Application](#registering-a-client-application)
4. [Integrating via JavaScript/TypeScript SDK](#integrating-via-javascripttypescript-sdk)
5. [Integrating via Python SDK](#integrating-via-python-sdk)
6. [Testing](#testing)

---

## Architecture Overview

ICA provides **Single Sign-On (SSO)** using **OAuth 2.0 + PKCE** and **OpenID Connect (OIDC)**.

The system is a **single Next.js application** deployed at one URL:

- **Frontend UI**: Login, registration, consent, and dashboard pages
- **Backend API**: OAuth 2.0 endpoints at `/api/oauth/*` and user management at `/api/auth/*`
- **Database**: PostgreSQL (Neon recommended) for users, sessions, OAuth clients, and tokens
- **SDKs**: `@iglobals/auth-client` (JavaScript/TypeScript) and `iglobals-auth` (Python)

**Key Benefit**: Your applications only need one URL to connect to - everything is served from the same deployment.

```
┌────────────────────────────────────────┐
│  Your App                              │
│  SDK configured with:                  │
│  baseUrl: 'https://auth.yourdomain.com'│
└─────────────┬──────────────────────────┘
              │
              ▼
┌────────────────────────────────────────┐
│  Next.js (auth.yourdomain.com)         │
│  ├── Frontend: /auth/login             │
│  ├── API: /api/oauth/token             │
│  ├── API: /api/oauth/authorize         │
│  └── Database: PostgreSQL              │
└────────────────────────────────────────┘
```

---

## Deployment

### Deploy to Vercel (Recommended)

1. **Set up database**:
   ```bash
   # Run migrations on your PostgreSQL database
   psql $DATABASE_URL -f migrations/001_extensions.sql
   psql $DATABASE_URL -f migrations/002_schema.sql
   psql $DATABASE_URL -f migrations/003_users.sql
   # ... run all migration files
   ```

2. **Generate JWT keys**:
   ```bash
   node scripts/generate-keys.js
   ```

3. **Configure environment variables in Vercel**:
   ```bash
   DATABASE_URL=postgresql://...
   JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
   JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
   JWT_KID=unique-key-id
   SESSION_SECRET=random-64-char-secret
   NEXT_PUBLIC_BASE_URL=https://auth.yourdomain.com
   ICA_BASE_URL=https://auth.yourdomain.com
   # ... add SMTP, admin credentials, etc.
   ```

4. **Deploy**:
   ```bash
   cd web
   vercel deploy --prod
   ```

Your auth server is now live at **one URL**: `https://auth.yourdomain.com`

### Local Development

1. **Install dependencies**:
   ```bash
   cd web
   npm install
   ```

2. **Create `.env.local`** with your environment variables

3. **Run development server**:
   ```bash
   npm run dev
   ```

Access at `http://localhost:3000`

---

## Registering a Client Application

Before an application can use the central auth system, it must be registered as an `oauth_client` in the database.

During development, you can manually insert a client directly into the database:
```sql
INSERT INTO ica.oauth_clients (client_id, client_secret_hash, name, redirect_uris)
VALUES (
  'my-awesome-app',
  '<bcrypt-hash-of-a-secret-string>', 
  'My Awesome App',
  '{"http://localhost:3000/auth/callback"}'
);
```

For production, you would use the internal **Admin API** to register clients (e.g., `POST /api/admin/clients`).

---

## Integrating via JavaScript/TypeScript SDK

### 1. Install the SDK
```bash
npm install @iglobals/auth-client
```

### 2. Initialize the Client
```typescript
import { ICAClient } from '@iglobals/auth-client';

const client = new ICAClient({
  baseUrl: 'https://auth.yourdomain.com',     // Your deployed ICA URL
  clientId: 'my-awesome-app',                 // From admin portal
  clientSecret: 'your-client-secret',         // From admin portal
  redirectUri: 'https://yourapp.com/callback', // Your callback URL
  scopes: ['openid', 'profile', 'email'],
});
```

### 3. Generate Auth URL & Redirect User
When a user clicks "Login":
```typescript
// Generate PKCE
const { codeVerifier, codeChallenge } = client.generatePKCE();
const state = crypto.randomUUID();

// Store verifier in session (server-side!)
req.session.codeVerifier = codeVerifier;
req.session.state = state;

// Get authorization URL
const authUrl = client.getAuthorizationUrl(state, codeChallenge);

// Redirect user
res.redirect(authUrl);
```

### 4. Handle the Callback & Exchange Code
User returns to your `redirectUri` with a code:
```typescript
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Verify state (CSRF protection)
  if (state !== req.session.state) {
    return res.status(400).send('Invalid state');
  }
  
  // Exchange code for tokens
  const tokens = await client.exchangeCode(
    code as string,
    req.session.codeVerifier
  );
  
  // Store tokens securely
  req.session.accessToken = tokens.access_token;
  req.session.refreshToken = tokens.refresh_token;
  
  // Get user info
  const userInfo = await client.getUserInfo(tokens.access_token);
  req.session.user = userInfo;
  
  res.redirect('/dashboard');
});
```

### 5. Protect Routes with Middleware
```typescript
import { ICAMiddleware } from '@iglobals/auth-client';

// Apply middleware to protect routes
app.use(ICAMiddleware({
  baseUrl: 'https://auth.yourdomain.com',
  clientId: 'my-awesome-app'
}));

app.get('/api/protected', (req, res) => {
  // req.user contains verified JWT claims
  res.json({ 
    message: `Hello ${req.user.email}!`,
    user: req.user 
  });
});
```

### 6. Refresh Tokens
```typescript
// When access token expires
try {
  const userInfo = await client.getUserInfo(accessToken);
} catch (error) {
  if (error.message.includes('expired')) {
    // Refresh the token
    const newTokens = await client.refreshAccessToken(refreshToken);
    // Update stored tokens
    req.session.accessToken = newTokens.access_token;
    req.session.refreshToken = newTokens.refresh_token;
  }
}
```

---

## Integrating via Python SDK

### 1. Install the SDK
```bash
pip install iglobals-auth
```

### 2. Initialize the Client
```python
from iglobals_auth import IGlobalsAuth

client = IGlobalsAuth(
    base_url='https://auth.yourdomain.com',     # Your deployed ICA URL
    client_id='my-awesome-app',                 # From admin portal
    client_secret='your-client-secret',         # From admin portal
    redirect_uri='https://yourapp.com/callback', # Your callback URL
    scopes=['openid', 'profile', 'email']
)
```

### 3. Generate Auth URL & Redirect User (Flask)
```python
from flask import Flask, redirect, session
import uuid

app = Flask(__name__)
app.secret_key = 'your-secret-key'

@app.route('/login')
def login():
    # Generate PKCE
    pkce = client.generate_pkce()
    state = str(uuid.uuid4())
    
    # Store in session
    session['pkce_verifier'] = pkce['code_verifier']
    session['state'] = state
    
    # Redirect to ICA
    auth_url = client.get_authorization_url(state, pkce['code_challenge'])
    return redirect(auth_url)
```

### 4. Handle the Callback & Exchange Code
```python
@app.route('/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Verify state
    if state != session.get('state'):
        return 'Invalid state', 400
    
    # Exchange code for tokens
    tokens = client.exchange_code(code, session['pkce_verifier'])
    
    # Store tokens
    session['access_token'] = tokens.access_token
    session['refresh_token'] = tokens.refresh_token
    
    # Get user info (returns a dictionary)
    user_info = client.get_user_info(tokens.access_token)
    session['user'] = {
        'id': user_info.get('sub'),
        'email': user_info.get('email'),
        'name': f"{user_info.get('given_name', '')} {user_info.get('family_name', '')}".strip()
    }
    
    return redirect('/dashboard')
```

### 5. FastAPI Integration
```python
from fastapi import FastAPI, Depends
from iglobals_auth.fastapi import ICAMiddleware

app = FastAPI()

# Create middleware
auth = ICAMiddleware(
    base_url='https://auth.yourdomain.com',
    client_id='my-awesome-app'
)

@app.get('/api/protected')
async def protected_route(user: dict = Depends(auth)):
    # user contains verified JWT claims
    return {
        'message': f"Hello {user['email']}!",
        'user': user
    }
```

### 6. Refresh Tokens
```python
try:
    user_info = client.get_user_info(access_token)
except Exception as e:
    if 'expired' in str(e).lower():
        # Refresh the token
        new_tokens = client.refresh_access_token(refresh_token)
        # Update stored tokens
        session['access_token'] = new_tokens.access_token
        session['refresh_token'] = new_tokens.refresh_token
```

---

## Testing

## Testing

### Manual End-to-End Test

1. **Start your deployment** (local: `npm run dev` in `web/` directory)
2. **Open browser**: Navigate to `http://localhost:3000` (or your deployed URL)
3. **Register**: Click "Become an I-con" and create an account
4. **Login**: Use your credentials to log in
5. **Dashboard**: You'll be redirected to `/dashboard` showing your profile

### Test OAuth Flow with Your App

1. **Create a test OAuth client** in the admin portal
2. **Configure your app** with the SDK pointing to your ICA URL
3. **Click login** in your app
4. **Verify redirect** to ICA login page
5. **Grant consent** if prompted
6. **Verify callback** returns to your app with user data

### Using Postman

**1. Get Authorization Code:**
```
GET https://auth.yourdomain.com/api/oauth/authorize
  ?client_id=your-client-id
  &redirect_uri=http://localhost/callback
  &response_type=code
  &scope=openid profile email
  &state=random-state
  &code_challenge=BASE64URL_SHA256_HASH
  &code_challenge_method=S256
```

**2. Exchange Code for Tokens:**
```
POST https://auth.yourdomain.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth-code-from-step-1",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "redirect_uri": "http://localhost/callback",
  "code_verifier": "original-code-verifier"
}
```

**3. Get User Info:**
```
GET https://auth.yourdomain.com/api/oauth/userinfo
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**4. Refresh Token:**
```
POST https://auth.yourdomain.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "your-refresh-token",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

---

## Key Concepts

### PKCE (Proof Key for Code Exchange)
- Protects against authorization code interception
- Generate `code_verifier` (random string)
- Create `code_challenge` = BASE64URL(SHA256(code_verifier))
- Send challenge in authorize request
- Send verifier in token request

### State Parameter
- Random string for CSRF protection
- Store in session before redirect
- Verify matches on callback

### Scopes
- `openid`: Required for OIDC, provides `sub` claim
- `profile`: Provides name fields
- `email`: Provides email and verification status
- `phone`: Provides phone number
- `address`: Provides address information

### Token Types
- **Access Token**: Short-lived (15 min), used for API requests
- **Refresh Token**: Long-lived (30 days), used to get new access tokens
- **ID Token**: Contains user identity claims (OIDC)

---

## Security Checklist

- ✅ Use HTTPS in production
- ✅ Store client secrets server-side only
- ✅ Validate state parameter (CSRF protection)
- ✅ Implement PKCE for public clients
- ✅ Store tokens in httpOnly cookies or secure server sessions
- ✅ Never expose tokens in URLs or client-side JavaScript
- ✅ Validate JWT signatures before trusting claims
- ✅ Handle token expiration and refresh gracefully
- ✅ Revoke tokens on logout
- ✅ Use exact redirect URI matching

---

## Troubleshooting

### "Invalid client credentials"
- Verify `client_id` and `client_secret` match admin portal
- Check client is active in database

### "Redirect URI mismatch"
- Ensure `redirect_uri` exactly matches registered URI
- Check for trailing slashes, http vs https

### "PKCE challenge failed"
- Verify you're sending the correct `code_verifier`
- Ensure it matches the `code_challenge` sent in authorize request

### "Invalid or expired code"
- Authorization codes expire in 10 minutes
- Codes can only be used once
- Don't reuse codes

### "Token expired"
- Access tokens expire in 15 minutes
- Use refresh token to get new access token
- Implement automatic token refresh in your app

---

## Support & Resources

- **Main README**: [README.md](./README.md)
- **JavaScript SDK Docs**: [sdk-js/README.md](./sdk-js/README.md)
- **Python SDK Docs**: [sdk-py/README.md](./sdk-py/README.md)
- **Full System Design**: [full-system-design.md](./full-system-design.md)

For issues and questions, open an issue on GitHub.
