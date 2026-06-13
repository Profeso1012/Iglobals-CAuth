# iGlobals Central Auth (ICA) - Integration Guide

Welcome to the **iGlobals Central Auth** integration guide. This document explains how the authentication service works, how to run it locally, and how to integrate it into any new or existing iGlobals application.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Running the Application Locally](#running-the-application-locally)
3. [Registering a Client Application](#registering-a-client-application)
4. [Integrating via JavaScript/TypeScript SDK](#integrating-via-javascripttypescript-sdk)
5. [Integrating via Python SDK](#integrating-via-python-sdk)
6. [Postman & Manual Testing](#postman--manual-testing)

---

## Architecture Overview

The ICA system provides Single Sign-On (SSO) across all iGlobals apps. It is based on **OAuth 2.0 + PKCE** and **OpenID Connect (OIDC)**.

The system is composed of:
1. **The Core Database**: A PostgreSQL database (e.g., Neon) that holds users, clients, authorization codes, refresh tokens, and consent histories.
2. **The Backend API (Express.js)**: Runs on port `3001` (or under `/api` in production). Handles the heavy lifting (OAuth exchanges, password hashing, JWT signing).
3. **The Frontend UI (Next.js)**: Runs on port `3000`. This provides the beautiful login, registration, and user dashboard pages. It proxies `/api/*` requests to the Express backend.
4. **The SDKs**: `@iglobals/auth-client` (JS) and `iglobals-auth` (Python).

---

## Running the Application Locally

1. **Install Dependencies**: From the root of the project, run:
   ```bash
   npm install
   ```
2. **Setup `.env`**: Make sure your `.env` contains valid keys. Specifically:
   - `DATABASE_URL`: Must point to your Neon PostgreSQL instance (which has been migrated).
   - `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`: Generated via `node scripts/generate-keys.js`.
3. **Start the API Server**:
   ```bash
   npm run dev:api
   ```
   *This starts the Express server on `http://localhost:3001`.*
4. **Start the Frontend Web App**:
   ```bash
   npm run dev:web
   ```
   *This starts Next.js on `http://localhost:3000`.*

You can now visit `http://localhost:3000/login` to see the login page!

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

If you are building a Node.js or Express app, use the `@iglobals/auth-client` SDK.

### 1. Install the SDK
```bash
npm install @iglobals/auth-client
```

### 2. Initialize the Client
```typescript
import { createIGlobalsAuth } from '@iglobals/auth-client';

const ica = createIGlobalsAuth({
  clientId: 'my-awesome-app',
  clientSecret: 'my-raw-secret-string',
  redirectUri: 'http://localhost:3000/auth/callback', // Must match EXACTLY what's in the DB
  scopes: ['openid', 'profile', 'email'],
  baseUrl: 'http://localhost:3000', // URL of the central auth service
});
```

### 3. Generate Auth URL & Redirect User
When a user clicks "Login", generate an authorization URL and redirect them:
```typescript
// Generate PKCE code verifier and challenge
const { codeVerifier, codeChallenge } = ica.generatePKCE();

// Save the verifier in the user's session cookie or local storage temporarily!
req.session.codeVerifier = codeVerifier;

// Get the redirect URL
const url = ica.getAuthorizationUrl('random_state_string', codeChallenge);

// Redirect the user
res.redirect(url);
```

### 4. Handle the Callback & Exchange Code
The user will be redirected back to your `redirectUri` with a `?code=` parameter.
```typescript
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  const verifier = req.session.codeVerifier;

  // Exchange the code for tokens!
  const tokens = await ica.exchangeCode(code, verifier);
  
  // Store the access token and refresh token securely in your app's session
  req.session.accessToken = tokens.access_token;
  req.session.refreshToken = tokens.refresh_token;

  res.redirect('/dashboard');
});
```

### 5. Protect Your Own Routes (Middleware)
You can easily protect your own app's endpoints using the included middleware:
```typescript
app.get('/api/protected-data', ica.requireAuth(), (req, res) => {
  // req.icaUser contains the verified JWT payload!
  res.json({ message: `Hello ${req.icaUser.email}!` });
});
```

---

## Integrating via Python SDK

If you are building a FastAPI or Flask app, use the `iglobals-auth` Python SDK.

### 1. Install the SDK
```bash
pip install iglobals-auth
```

### 2. Initialize the Client
```python
from iglobals_auth import IGlobalsAuth

ica = IGlobalsAuth(
    client_id='my-awesome-app',
    client_secret='my-raw-secret-string',
    redirect_uri='http://localhost:8000/auth/callback',
    base_url='http://localhost:3000',
)
```

### 3. Generate Auth URL & Redirect User
```python
from iglobals_auth import generate_pkce

pkce = generate_pkce()
# Save pkce['code_verifier'] to the user's session securely!

url = ica.get_authorization_url(state='xyz123', code_challenge=pkce['code_challenge'])
# Redirect the user to `url`
```

### 4. Handle the Callback & Exchange Code
```python
tokens = ica.exchange_code(code='the_code_from_url', code_verifier='saved_verifier_from_session')
# tokens.access_token contains your JWT!
```

### 5. FastAPI Dependency
To protect a FastAPI endpoint:
```python
from fastapi import FastAPI, Depends
from iglobals_auth import require_auth

app = FastAPI()

@app.get("/protected")
async def protected_route(user: dict = Depends(require_auth(ica))):
    return {"message": f"Welcome, {user['email']}!"}
```

---

## Postman & Manual Testing

To quickly see the frontend and perform an end-to-end test manually without a third-party app:
1. Ensure both the API (`npm run dev:api`) and Next.js (`npm run dev:web`) are running.
2. Open your browser and navigate to `http://localhost:3000`.
3. You will be redirected to `http://localhost:3000/login`.
4. Click on **Become an I-con** to register a new account.
5. Fill out the registration form.
6. Once registered successfully, you will be redirected to the internal Central Auth Dashboard (`/dashboard`).

Because of the SSO implementation, as long as you are logged into the central dashboard, any app that redirects you to Central Auth will automatically approve you (or ask for simple one-click Consent) without requiring you to type your password again!
