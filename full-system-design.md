# iGlobals Central Auth (ICA) — Full System Design Source of Truth

> **Purpose:** This document is the complete, authoritative specification for the iGlobals Central Authentication service. It is intended as a handoff document for an AI agent or developer to implement from scratch. Every table, every endpoint, every file, every function, and every SDK export is defined here. Nothing is left to interpretation.

> **Stack:** Node.js + Express (API), Next.js 14 App Router (Frontend), PostgreSQL via Neon (serverless, raw `pg`, no ORM), `@iglobals/auth-client` (npm SDK), `iglobals-auth` (PyPI SDK).

> **Domain convention used throughout:** `https://auth.iglobals.com` (ICA service), `https://auth.iglobals.com/api` (Express API mounted inside Next.js via custom server or deployed separately).

---

## Table of Contents

1. [Phase 1 — Database Schema](#phase-1--database-schema)
2. [Phase 2 — Backend API (Express)](#phase-2--backend-api-express)
3. [Phase 3 — Frontend (Next.js App Router)](#phase-3--frontend-nextjs-app-router)
4. [Phase 4 — npm SDK (@iglobals/auth-client)](#phase-4--npm-sdk-iglobalsauth-client)
5. [Phase 5 — Python SDK (iglobals-auth)](#phase-5--python-sdk-iglobals-auth)
6. [Phase 6 — Project Scaffolding](#phase-6--project-scaffolding)

---

# Phase 1 — Database Schema

## 1.1 Extensions

```sql
-- Run once on the Neon database before any migrations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text for email columns
```

## 1.2 Schema Namespace

```sql
CREATE SCHEMA IF NOT EXISTS ica;
SET search_path TO ica, public;
```

All tables below live in the `ica` schema. Always qualify with `ica.` in queries or set `search_path`.

---

## 1.3 Table: `ica.users`

The master identity record for every person across all iGlobals products.

```sql
CREATE TABLE ica.users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT      NOT NULL,
    email_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
    phone               TEXT,                          -- E.164 format e.g. +2348012345678
    phone_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
    password_hash       TEXT        NOT NULL,          -- bcrypt, cost 12
    first_name          TEXT        NOT NULL,
    last_name           TEXT        NOT NULL,
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,
    state               TEXT,
    country             TEXT,                          -- ISO 3166-1 alpha-2
    postal_code         TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ica_users_email_unique ON ica.users (email);
CREATE INDEX ica_users_phone_idx          ON ica.users (phone) WHERE phone IS NOT NULL;
CREATE INDEX ica_users_created_at_idx     ON ica.users (created_at);
```

**Constraints:** Email is `CITEXT` so `user@example.com` and `User@Example.com` are treated as the same address at the DB level. Phone is nullable — not all apps need it at registration time. `password_hash` is always set; social/magic-link login variants can store a sentinel value like `'OAUTH_ONLY'` and never expose a password flow.

---

## 1.4 Table: `ica.oauth_clients`

Registry of every iGlobals application that uses ICA for auth.

```sql
CREATE TABLE ica.oauth_clients (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           TEXT        NOT NULL,          -- public identifier e.g. 'carrylink-prod'
    client_secret_hash  TEXT        NOT NULL,          -- bcrypt hash of the raw secret
    name                TEXT        NOT NULL,          -- shown on consent screen e.g. 'CarryLink'
    description         TEXT,
    logo_url            TEXT,
    redirect_uris       TEXT[]      NOT NULL,          -- exact match array; no wildcards
    allowed_scopes      TEXT[]      NOT NULL DEFAULT ARRAY['openid','profile','email'],
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ica_oauth_clients_client_id_unique ON ica.oauth_clients (client_id);
```

**Valid scope values:** `openid`, `profile`, `email`, `phone`, `address`. The `openid` scope is always required. `allowed_scopes` on the client limits which scopes the client is even permitted to request — it cannot request a scope not in this array regardless of what it sends in the authorization request.

---

## 1.5 Table: `ica.authorization_codes`

Short-lived one-time codes issued after a successful login, exchanged by the client app's backend for tokens.

```sql
CREATE TABLE ica.authorization_codes (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    TEXT        NOT NULL,      -- 64 hex chars (32 random bytes)
    client_id               TEXT        NOT NULL REFERENCES ica.oauth_clients(client_id) ON DELETE CASCADE,
    user_id                 UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    scopes                  TEXT[]      NOT NULL,
    redirect_uri            TEXT        NOT NULL,      -- exact URI used in the auth request
    code_challenge          TEXT        NOT NULL,      -- BASE64URL(SHA256(code_verifier))
    code_challenge_method   TEXT        NOT NULL DEFAULT 'S256',
    expires_at              TIMESTAMPTZ NOT NULL,      -- NOW() + INTERVAL '10 minutes'
    used_at                 TIMESTAMPTZ,               -- NULL = unused; non-NULL = consumed
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ica_auth_codes_code_unique ON ica.authorization_codes (code);
CREATE INDEX ica_auth_codes_expires_at_idx     ON ica.authorization_codes (expires_at);
CREATE INDEX ica_auth_codes_user_client_idx    ON ica.authorization_codes (user_id, client_id);
```

**Cleanup:** A cron job (or Neon scheduled function) runs `DELETE FROM ica.authorization_codes WHERE expires_at < NOW() - INTERVAL '1 hour'` daily to purge stale codes.

---

## 1.6 Table: `ica.refresh_tokens`

Long-lived credentials stored by client apps, used to silently obtain new access tokens.

```sql
CREATE TABLE ica.refresh_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash      TEXT        NOT NULL,              -- SHA-256 hex of the raw token
    client_id       TEXT        NOT NULL REFERENCES ica.oauth_clients(client_id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    scopes          TEXT[]      NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,              -- default NOW() + INTERVAL '30 days'
    revoked_at      TIMESTAMPTZ,                       -- NULL = active
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX ica_refresh_tokens_hash_unique    ON ica.refresh_tokens (token_hash);
CREATE INDEX ica_refresh_tokens_user_client_idx       ON ica.refresh_tokens (user_id, client_id);
CREATE INDEX ica_refresh_tokens_expires_at_idx        ON ica.refresh_tokens (expires_at);
```

**Rotation:** On every refresh grant, the current token row has `revoked_at` set to `NOW()` and a new row is inserted. The client receives the new raw token. If an already-revoked token is presented (replay attack), ICA revokes ALL refresh tokens for that `(user_id, client_id)` pair and forces re-login.

---

## 1.7 Table: `ica.user_consents`

Records which user has approved which scopes for which client app. Used to skip the consent screen on repeat logins.

```sql
CREATE TABLE ica.user_consents (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    client_id   TEXT        NOT NULL REFERENCES ica.oauth_clients(client_id) ON DELETE CASCADE,
    scopes      TEXT[]      NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ                            -- NULL = active consent
);

CREATE UNIQUE INDEX ica_consents_user_client_unique ON ica.user_consents (user_id, client_id)
    WHERE revoked_at IS NULL;
CREATE INDEX ica_consents_user_idx ON ica.user_consents (user_id);
```

---

## 1.8 Table: `ica.ica_sessions`

ICA's own browser sessions — the SSO session cookie lives here.

```sql
CREATE TABLE ica.ica_sessions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash  TEXT        NOT NULL,          -- SHA-256 hex of the raw cookie value
    user_id             UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    user_agent          TEXT,
    ip_address          INET,
    remember_me         BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at          TIMESTAMPTZ NOT NULL,          -- 24h normal, 30d if remember_me
    last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ica_sessions_token_hash_unique ON ica.ica_sessions (session_token_hash);
CREATE INDEX ica_sessions_user_idx                 ON ica.ica_sessions (user_id);
CREATE INDEX ica_sessions_expires_at_idx           ON ica.ica_sessions (expires_at);
```

---

## 1.9 Table: `ica.email_verifications`

OTP records for email address verification.

```sql
CREATE TABLE ica.email_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    email       CITEXT      NOT NULL,
    otp_hash    TEXT        NOT NULL,                  -- bcrypt hash of the 6-digit OTP
    expires_at  TIMESTAMPTZ NOT NULL,                  -- NOW() + INTERVAL '10 minutes'
    verified_at TIMESTAMPTZ,
    attempts    INT         NOT NULL DEFAULT 0,        -- max 5 before record is invalidated
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ica_email_verif_user_idx     ON ica.email_verifications (user_id);
CREATE INDEX ica_email_verif_expires_idx  ON ica.email_verifications (expires_at);
```

---

## 1.10 Table: `ica.phone_verifications`

OTP records for phone number verification.

```sql
CREATE TABLE ica.phone_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    phone       TEXT        NOT NULL,
    otp_hash    TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    attempts    INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ica_phone_verif_user_idx    ON ica.phone_verifications (user_id);
CREATE INDEX ica_phone_verif_expires_idx ON ica.phone_verifications (expires_at);
```

---

## 1.11 Table: `ica.password_reset_requests`

```sql
CREATE TABLE ica.password_reset_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL,                  -- SHA-256 of the raw reset token
    expires_at  TIMESTAMPTZ NOT NULL,                  -- NOW() + INTERVAL '1 hour'
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ica_pwd_reset_token_unique ON ica.password_reset_requests (token_hash);
CREATE INDEX ica_pwd_reset_user_idx            ON ica.password_reset_requests (user_id);
CREATE INDEX ica_pwd_reset_expires_idx         ON ica.password_reset_requests (expires_at);
```

---

## 1.12 Table: `ica.audit_log`

Append-only security event log. Never delete rows.

```sql
CREATE TABLE ica.audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  TEXT        NOT NULL,
    user_id     UUID        REFERENCES ica.users(id) ON DELETE SET NULL,
    client_id   TEXT        REFERENCES ica.oauth_clients(client_id) ON DELETE SET NULL,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ica_audit_user_idx       ON ica.audit_log (user_id);
CREATE INDEX ica_audit_event_type_idx ON ica.audit_log (event_type);
CREATE INDEX ica_audit_created_at_idx ON ica.audit_log (created_at DESC);
```

**Event types (enum-like TEXT values):** `user.registered`, `user.login.success`, `user.login.failed`, `user.logout`, `user.password.changed`, `user.password.reset.requested`, `user.password.reset.completed`, `user.email.verification.sent`, `user.email.verified`, `user.phone.verification.sent`, `user.phone.verified`, `oauth.code.issued`, `oauth.code.exchanged`, `oauth.token.refreshed`, `oauth.token.revoked`, `oauth.consent.granted`, `oauth.consent.revoked`, `admin.client.created`, `admin.client.updated`, `admin.user.disabled`.

---

## 1.13 Migration File Order

```
migrations/
  001_extensions.sql
  002_schema.sql
  003_users.sql
  004_oauth_clients.sql
  005_authorization_codes.sql
  006_refresh_tokens.sql
  007_user_consents.sql
  008_ica_sessions.sql
  009_email_verifications.sql
  010_phone_verifications.sql
  011_password_reset_requests.sql
  012_audit_log.sql
  013_seed_admin_client.sql   -- inserts the ICA admin panel's own oauth_client row
```

Run with: `node scripts/migrate.js` which reads files in order and executes each in a transaction.

---

# Phase 2 — Backend API (Express)

## 2.1 Global Conventions

**Base URL:** `/api` (all routes below are relative to this)

**Authentication on protected endpoints:** `Authorization: Bearer <access_token>` header.

**Admin endpoints:** Additional `Authorization: Bearer <admin_jwt>` where the admin JWT contains `role: 'ica_admin'` in its payload.

**Content-Type:** All request bodies are `application/json` unless noted. All responses are `application/json`.

**Error response shape (all endpoints, all failures):**
```json
{
  "error": "error_code_snake_case",
  "error_description": "Human-readable explanation of what went wrong.",
  "status": 400
}
```

**Success envelope:** Endpoints return data directly (no wrapper object) unless noted. The HTTP status code communicates success/failure.

---

## 2.2 OAuth Protocol Endpoints

### `GET /api/oauth/authorize`

Initiates the OAuth authorization code flow. Called via browser redirect from a client app.

**Request — Query Parameters:**

| Parameter | Required | Description |
|---|---|---|
| `client_id` | Yes | Registered client identifier |
| `redirect_uri` | Yes | Must exactly match a registered redirect URI |
| `response_type` | Yes | Must be `code` |
| `scope` | Yes | Space-separated. Must include `openid`. e.g. `openid profile email` |
| `state` | Yes | Random string from client, returned unchanged. CSRF protection. |
| `code_challenge` | Yes | BASE64URL(SHA256(code_verifier)) |
| `code_challenge_method` | Yes | Must be `S256` |

**Request — Headers:** None required. ICA reads its own session cookie (`ica_session`) to check for existing SSO session.

**Request — Cookies:**

| Cookie | Description |
|---|---|
| `ica_session` | ICA's SSO session token. If present and valid, login is skipped. |

**Flow Logic:**
1. Validate `client_id` exists and `is_active`.
2. Validate `redirect_uri` is in `oauth_clients.redirect_uris` (exact match).
3. Validate `response_type === 'code'`.
4. Validate all requested scopes are in `oauth_clients.allowed_scopes`.
5. Check for valid `ica_session` cookie.
6. **If session exists:** check `user_consents` for this `(user_id, client_id, scopes)`. If consent exists → skip consent screen, issue code immediately, redirect. If new scopes → show consent screen.
7. **If no session:** redirect to `/login?...` (ICA's frontend login page), preserving all OAuth params in the URL or a short-lived `oauth_state` server-side record.

**Success Response — Redirect (302):**
```
Location: https://app.iglobals.com/auth/callback?code=<64-hex-chars>&state=<client-state>
```

**Failure Response — Redirect (302) back to `redirect_uri` with error:**
```
Location: https://app.iglobals.com/auth/callback?error=invalid_request&error_description=...&state=<state>
```

**Failure Response — Direct HTTP error (when redirect_uri itself is invalid, so we cannot redirect):**
```json
HTTP 400
{
  "error": "invalid_client",
  "error_description": "client_id not found or redirect_uri does not match any registered URI.",
  "status": 400
}
```

---

### `POST /api/oauth/token`

Token endpoint. Called server-to-server by the client app's backend. Never called from a browser.

**Request — Headers:**
```
Content-Type: application/json
```

**Request — Body (Authorization Code grant):**
```json
{
  "grant_type": "authorization_code",
  "code": "a3f9...64hexchars",
  "redirect_uri": "https://app.iglobals.com/auth/callback",
  "client_id": "myapp-prod",
  "client_secret": "raw-256bit-secret",
  "code_verifier": "the-original-pkce-verifier-string"
}
```

**Request — Body (Refresh Token grant):**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "raw-refresh-token",
  "client_id": "myapp-prod",
  "client_secret": "raw-256bit-secret"
}
```

**Success Response — Authorization Code (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "b7e2...64hexchars",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
  "scope": "openid profile email"
}
```

**Success Response — Refresh Token (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "c9f1...64hexchars",
  "scope": "openid profile email"
}
```

**Access Token JWT Payload:**
```json
{
  "iss": "https://auth.iglobals.com",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "aud": "myapp-prod",
  "iat": 1700000000,
  "exp": 1700000900,
  "scope": "openid profile email",
  "email": "user@example.com",
  "email_verified": true
}
```

**ID Token JWT Payload:**
```json
{
  "iss": "https://auth.iglobals.com",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "aud": "myapp-prod",
  "iat": 1700000000,
  "exp": 1700003600,
  "given_name": "Profeso",
  "family_name": "Doe",
  "email": "user@example.com",
  "email_verified": true,
  "phone_number": "+2348012345678",
  "phone_number_verified": false
}
```
*(ID token only includes claims for scopes that were granted.)*

**Failure Responses:**
```json
HTTP 400 — invalid grant_type
{
  "error": "unsupported_grant_type",
  "error_description": "grant_type must be authorization_code or refresh_token.",
  "status": 400
}
```
```json
HTTP 401 — wrong client_secret
{
  "error": "invalid_client",
  "error_description": "client_id or client_secret is incorrect.",
  "status": 401
}
```
```json
HTTP 400 — code expired or already used
{
  "error": "invalid_grant",
  "error_description": "Authorization code is expired, already used, or does not exist.",
  "status": 400
}
```
```json
HTTP 400 — PKCE verification failed
{
  "error": "invalid_grant",
  "error_description": "code_verifier does not match the code_challenge.",
  "status": 400
}
```
```json
HTTP 400 — refresh token revoked or expired
{
  "error": "invalid_grant",
  "error_description": "Refresh token is revoked, expired, or does not exist.",
  "status": 400
}
```
```json
HTTP 400 — refresh token replay detected (rotation violation)
{
  "error": "invalid_grant",
  "error_description": "Token reuse detected. All sessions for this client have been revoked.",
  "status": 400
}
```

---

### `POST /api/oauth/revoke`

Revokes a refresh token. Called server-to-server by a client app during logout.

**Request — Body:**
```json
{
  "token": "raw-refresh-token",
  "client_id": "myapp-prod",
  "client_secret": "raw-256bit-secret"
}
```

**Success Response (200):**
```json
{ "revoked": true }
```

**Failure Responses:**
```json
HTTP 401
{ "error": "invalid_client", "error_description": "client_id or client_secret is incorrect.", "status": 401 }
```
```json
HTTP 404
{ "error": "token_not_found", "error_description": "Token does not exist or belongs to a different client.", "status": 404 }
```

---

### `GET /api/oauth/userinfo`

Returns OIDC UserInfo claims for the authenticated user. Protected by access token.

**Request — Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "given_name": "Profeso",
  "family_name": "Doe",
  "email": "user@example.com",
  "email_verified": true,
  "phone_number": "+2348012345678",
  "phone_number_verified": false,
  "address": {
    "street_address": "12 Main Street",
    "locality": "Lagos",
    "region": "Lagos State",
    "postal_code": "100001",
    "country": "NG"
  }
}
```
*(Only fields for granted scopes are included.)*

**Failure Responses:**
```json
HTTP 401 — missing or malformed token
{ "error": "unauthorized", "error_description": "Bearer token missing or malformed.", "status": 401 }
```
```json
HTTP 401 — expired token
{ "error": "token_expired", "error_description": "Access token has expired.", "status": 401 }
```
```json
HTTP 403 — token issued for different client
{ "error": "forbidden", "error_description": "Token audience does not match.", "status": 403 }
```

---

### `GET /api/oauth/jwks`

Returns the public JWKS used to verify JWT signatures. Public endpoint, no auth.

**Success Response (200):**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key-1",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

**Cache-Control header:** `Cache-Control: public, max-age=3600`

---

### `GET /api/.well-known/openid-configuration`

OIDC Discovery document. Public endpoint, no auth.

**Success Response (200):**
```json
{
  "issuer": "https://auth.iglobals.com",
  "authorization_endpoint": "https://auth.iglobals.com/api/oauth/authorize",
  "token_endpoint": "https://auth.iglobals.com/api/oauth/token",
  "userinfo_endpoint": "https://auth.iglobals.com/api/oauth/userinfo",
  "jwks_uri": "https://auth.iglobals.com/api/oauth/jwks",
  "revocation_endpoint": "https://auth.iglobals.com/api/oauth/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email", "phone", "address"],
  "token_endpoint_auth_methods_supported": ["client_secret_post"],
  "code_challenge_methods_supported": ["S256"]
}
```

---

## 2.3 Auth Endpoints (ICA Frontend ↔ ICA Backend)

These are called by ICA's own Next.js frontend pages. Session cookie authenticated.

---

### `POST /api/auth/register`

**Request — Headers:**
```
Content-Type: application/json
X-Forwarded-For: <ip>   (set by reverse proxy)
```

**Request — Body:**
```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass",
  "first_name": "Profeso",
  "last_name": "Doe",
  "phone": "+2348012345678",
  "oauth_context": {
    "client_id": "carrylink-prod",
    "redirect_uri": "https://carrylink.com/auth/callback",
    "state": "abc123",
    "code_challenge": "xyz789",
    "scopes": ["openid", "profile", "email"]
  }
}
```

`oauth_context` is present when registration was triggered by an OAuth flow (the usual case). It is optional for direct registration via ICA's own settings page (unusual).

**Success Response (201):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "redirect_to": "https://carrylink.com/auth/callback?code=a3f9...&state=abc123"
}
```

**Response — Cookies set:**
```
Set-Cookie: ica_session=<raw-session-token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
```

**Failure Responses:**
```json
HTTP 409 — email already exists
{ "error": "email_taken", "error_description": "An account with this email address already exists.", "status": 409 }
```
```json
HTTP 422 — validation failure
{
  "error": "validation_error",
  "error_description": "One or more fields are invalid.",
  "fields": {
    "email": "Must be a valid email address.",
    "password": "Must be at least 8 characters and contain a number and symbol.",
    "first_name": "Required."
  },
  "status": 422
}
```
```json
HTTP 400 — invalid oauth_context
{ "error": "invalid_oauth_context", "error_description": "client_id not found or redirect_uri does not match.", "status": 400 }
```

---

### `POST /api/auth/login`

**Request — Body:**
```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass",
  "remember_me": false,
  "oauth_context": {
    "client_id": "carrylink-prod",
    "redirect_uri": "https://carrylink.com/auth/callback",
    "state": "abc123",
    "code_challenge": "xyz789",
    "scopes": ["openid", "profile", "email"]
  }
}
```

**Success Response (200):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "redirect_to": "https://carrylink.com/auth/callback?code=a3f9...&state=abc123"
}
```

If `oauth_context` is absent (direct login, not from an app redirect):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "redirect_to": "/dashboard"
}
```

**Response — Cookies set:**
```
Set-Cookie: ica_session=<raw-session-token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
```
(Max-Age is 2592000 — 30 days — if `remember_me: true`.)

**Failure Responses:**
```json
HTTP 401 — wrong credentials
{ "error": "invalid_credentials", "error_description": "Email or password is incorrect.", "status": 401 }
```
```json
HTTP 403 — account disabled
{ "error": "account_disabled", "error_description": "This account has been disabled. Contact support.", "status": 403 }
```
```json
HTTP 429 — rate limited
{ "error": "too_many_requests", "error_description": "Too many login attempts. Try again in 15 minutes.", "status": 429 }
```

---

### `POST /api/auth/logout`

**Request — Cookies:** `ica_session` must be present.

**Request — Body:**
```json
{
  "global": false
}
```
If `global: true`, all ICA sessions for the user are revoked and all refresh tokens across all clients are revoked.

**Success Response (200):**
```json
{ "logged_out": true }
```

**Response — Cookies cleared:**
```
Set-Cookie: ica_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
```

---

### `POST /api/auth/verify-email`

**Request — Cookies:** `ica_session` required (user must be logged in).

**Request — Body:**
```json
{ "otp": "483920" }
```

**Success Response (200):**
```json
{ "email_verified": true }
```

**Failure Responses:**
```json
HTTP 400 — wrong OTP
{ "error": "invalid_otp", "error_description": "The code is incorrect.", "status": 400 }
```
```json
HTTP 400 — expired
{ "error": "otp_expired", "error_description": "The verification code has expired. Request a new one.", "status": 400 }
```
```json
HTTP 429 — too many attempts
{ "error": "too_many_attempts", "error_description": "Maximum attempts reached. Request a new code.", "status": 429 }
```

---

### `POST /api/auth/send-email-verification`

Sends (or resends) the email OTP.

**Request — Cookies:** `ica_session` required.

**Success Response (200):**
```json
{ "sent": true, "email": "u***@example.com" }
```

---

### `POST /api/auth/verify-phone`

**Request — Cookies:** `ica_session` required.

**Request — Body:**
```json
{ "otp": "374821" }
```

**Success Response (200):**
```json
{ "phone_verified": true }
```

**Failure Responses:** Same shape as `verify-email`.

---

### `POST /api/auth/send-phone-verification`

**Request — Cookies:** `ica_session` required.

**Success Response (200):**
```json
{ "sent": true, "phone": "+234801****678" }
```

---

### `POST /api/auth/forgot-password`

**Request — Body:**
```json
{ "email": "user@example.com" }
```

**Success Response (200):** Always returns this (no information leakage):
```json
{ "sent": true, "message": "If an account with that email exists, a reset link has been sent." }
```

---

### `POST /api/auth/reset-password`

**Request — Body:**
```json
{
  "token": "raw-reset-token-from-email-link",
  "new_password": "NewStr0ng!Pass"
}
```

**Success Response (200):**
```json
{ "reset": true }
```

**Failure Responses:**
```json
HTTP 400 — invalid or expired token
{ "error": "invalid_token", "error_description": "Reset link is invalid or has expired.", "status": 400 }
```
```json
HTTP 400 — token already used
{ "error": "token_used", "error_description": "This reset link has already been used.", "status": 400 }
```

---

## 2.4 User Profile Endpoints

All require `ica_session` cookie.

### `GET /api/auth/me`

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "email_verified": true,
  "phone": "+2348012345678",
  "phone_verified": false,
  "first_name": "Profeso",
  "last_name": "Doe",
  "address_line1": "12 Main Street",
  "address_line2": null,
  "city": "Lagos",
  "state": "Lagos State",
  "country": "NG",
  "postal_code": "100001",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### `PATCH /api/auth/me`

**Request — Body:** Any subset of updatable fields:
```json
{
  "first_name": "Profeso",
  "last_name": "Doe",
  "phone": "+2348099999999",
  "address_line1": "15 New Street",
  "city": "Abuja",
  "state": "FCT",
  "country": "NG",
  "postal_code": "900001"
}
```

Note: `email` is not updatable via this endpoint (requires re-verification flow). `password` has its own endpoint.

**Success Response (200):** Same shape as `GET /api/auth/me` with updated values.

---

### `POST /api/auth/change-password`

**Request — Cookies:** `ica_session` required.

**Request — Body:**
```json
{
  "current_password": "OldStr0ng!Pass",
  "new_password": "NewStr0ng!Pass"
}
```

**Success Response (200):**
```json
{ "changed": true }
```

**Failure Responses:**
```json
HTTP 401
{ "error": "invalid_password", "error_description": "Current password is incorrect.", "status": 401 }
```

---

### `GET /api/auth/sessions`

Returns all active ICA sessions for the current user.

**Success Response (200):**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "user_agent": "Mozilla/5.0 ...",
      "ip_address": "102.89.1.1",
      "created_at": "2024-01-15T10:30:00Z",
      "last_active_at": "2024-01-16T08:00:00Z",
      "current": true
    }
  ]
}
```

---

### `DELETE /api/auth/sessions/:sessionId`

**Success Response (200):**
```json
{ "revoked": true }
```

---

### `GET /api/auth/apps`

Returns all apps the user has authorized.

**Success Response (200):**
```json
{
  "apps": [
    {
      "client_id": "carrylink-prod",
      "name": "CarryLink",
      "logo_url": "https://carrylink.com/logo.png",
      "scopes": ["openid", "profile", "email"],
      "granted_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### `DELETE /api/auth/apps/:clientId`

Revokes all tokens and consent for a specific app.

**Success Response (200):**
```json
{ "revoked": true }
```

---

## 2.5 Admin Endpoints

Require admin JWT in `Authorization: Bearer` header. Admin JWT is issued by a separate internal `POST /api/admin/login` (not exposed publicly).

### `POST /api/admin/clients`

**Request — Body:**
```json
{
  "client_id": "newapp-prod",
  "name": "New App",
  "description": "The new iGlobals product",
  "logo_url": "https://newapp.iglobals.com/logo.png",
  "redirect_uris": ["https://newapp.iglobals.com/auth/callback"],
  "allowed_scopes": ["openid", "profile", "email"]
}
```

**Success Response (201):**
```json
{
  "client_id": "newapp-prod",
  "client_secret": "raw-secret-shown-once-never-again",
  "name": "New App",
  "redirect_uris": ["https://newapp.iglobals.com/auth/callback"],
  "allowed_scopes": ["openid", "profile", "email"],
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### `PATCH /api/admin/clients/:clientId`

**Request — Body:** Any subset of `name`, `description`, `logo_url`, `redirect_uris`, `allowed_scopes`, `is_active`.

**Success Response (200):** Updated client object (without secret).

---

### `POST /api/admin/clients/:clientId/rotate-secret`

Generates a new client secret, invalidates the old one.

**Success Response (200):**
```json
{ "client_id": "newapp-prod", "client_secret": "new-raw-secret-shown-once" }
```

---

### `GET /api/admin/users/:userId`

**Success Response (200):** Full user object from `ica.users`.

---

### `POST /api/admin/users/:userId/disable`

**Success Response (200):**
```json
{ "disabled": true }
```

---

# Phase 3 — Frontend (Next.js App Router)

## 3.1 Pages and Their Purpose

```
app/
  layout.tsx                  -- root layout, loads fonts, ICA theme CSS vars
  page.tsx                    -- root redirect: /dashboard if session, else /login

  (auth)/
    layout.tsx                -- centered card layout for all auth pages
    login/
      page.tsx                -- Login form page
    register/
      page.tsx                -- Register form page
    consent/
      page.tsx                -- OAuth consent screen
    verify-email/
      page.tsx                -- Enter email OTP
    verify-phone/
      page.tsx                -- Enter phone OTP
    forgot-password/
      page.tsx                -- Request password reset email
    reset-password/
      page.tsx                -- Enter new password (has token in URL)

  (dashboard)/
    layout.tsx                -- Sidebar layout, requires session
    dashboard/
      page.tsx                -- User home: welcome, quick actions
    profile/
      page.tsx                -- Edit name, phone, address
    security/
      page.tsx                -- Change password, list sessions
    apps/
      page.tsx                -- Authorized apps, revoke access
```

## 3.2 Key Frontend Behaviors

**Login page** (`/login`): Reads OAuth params from URL query string (`client_id`, `redirect_uri`, etc.) if present, stores them in a hidden form field or `sessionStorage`. On successful login, calls `POST /api/auth/login` including `oauth_context` if present, then redirects to the `redirect_to` URL returned by the API.

**Register page** (`/register`): Same OAuth context handling as login. On success, redirects to `redirect_to`.

**Consent page** (`/consent`): Shown when a user's active session exists but consent for the requesting app's scopes has not been recorded. Displays the app's name, logo, and the list of scopes requested with human-readable descriptions. On "Allow", calls `POST /api/oauth/consent` which records consent and returns the redirect URL. On "Deny", redirects back to the app with `error=access_denied`.

**Dashboard layout**: On mount, calls `GET /api/auth/me` with the session cookie. If 401, redirects to `/login`. Stores user data in React context.

---

# Phase 4 — npm SDK (@iglobals/auth-client)

## 4.1 Installation

```bash
npm install @iglobals/auth-client
```

## 4.2 Factory Function

```typescript
import { createIGlobalsAuth } from '@iglobals/auth-client';

const ica = createIGlobalsAuth({
  clientId: process.env.ICA_CLIENT_ID,
  clientSecret: process.env.ICA_CLIENT_SECRET,
  redirectUri: process.env.ICA_REDIRECT_URI,
  scopes: ['openid', 'profile', 'email'],
  baseUrl: process.env.ICA_BASE_URL,  // https://auth.iglobals.com
});
```

## 4.3 Exported Functions

### `ica.getAuthorizationUrl(state, codeChallenge)`
Returns the full URL string to redirect the user's browser to ICA's authorize endpoint.

**Accepts:** `state: string`, `codeChallenge: string`
**Returns:** `string`

### `ica.generatePKCE()`
Generates a PKCE pair.

**Returns:** `{ codeVerifier: string, codeChallenge: string }`

### `ica.exchangeCode(code, codeVerifier)`
Calls `POST /api/oauth/token` with `grant_type=authorization_code`.

**Accepts:** `code: string`, `codeVerifier: string`
**Returns:** `Promise<{ access_token, token_type, expires_in, refresh_token, id_token, scope }>`
**Throws:** `ICAError` with `error` and `error_description` fields on failure.

### `ica.refreshAccessToken(refreshToken)`
Calls `POST /api/oauth/token` with `grant_type=refresh_token`.

**Accepts:** `refreshToken: string`
**Returns:** `Promise<{ access_token, token_type, expires_in, refresh_token, scope }>`

### `ica.getUserInfo(accessToken)`
Calls `GET /api/oauth/userinfo`.

**Accepts:** `accessToken: string`
**Returns:** `Promise<UserInfoClaims>`

### `ica.verifyToken(jwt)`
Fetches JWKS from ICA (cached in memory for 1 hour), verifies signature, checks `iss`, `aud`, `exp`.

**Accepts:** `jwt: string`
**Returns:** `Promise<JWTPayload>`
**Throws:** `ICAError` if invalid or expired.

### `ica.revokeToken(refreshToken)`
Calls `POST /api/oauth/revoke`.

**Accepts:** `refreshToken: string`
**Returns:** `Promise<{ revoked: boolean }>`

## 4.4 Express Middleware Helpers

```typescript
import { createIGlobalsAuth } from '@iglobals/auth-client';
const ica = createIGlobalsAuth({ ... });

// Use as Express middleware
app.get('/protected', ica.requireAuth(), (req, res) => {
  // req.icaUser: decoded JWT payload
  res.json({ user: req.icaUser });
});

// Optional auth — populates req.icaUser if token present, continues regardless
app.get('/optional', ica.optionalAuth(), (req, res) => {
  res.json({ user: req.icaUser ?? null });
});
```

---

# Phase 5 — Python SDK (iglobals-auth)

## 5.1 Installation

```bash
pip install iglobals-auth
```

## 5.2 Client Class

```python
from iglobals_auth import IGlobalsAuth

ica = IGlobalsAuth(
    client_id=os.environ['ICA_CLIENT_ID'],
    client_secret=os.environ['ICA_CLIENT_SECRET'],
    redirect_uri=os.environ['ICA_REDIRECT_URI'],
    scopes=['openid', 'profile', 'email'],
    base_url=os.environ['ICA_BASE_URL'],
)
```

## 5.3 Methods

| Method | Accepts | Returns |
|---|---|---|
| `get_authorization_url(state, code_challenge)` | `str, str` | `str` |
| `generate_pkce()` | — | `dict[code_verifier, code_challenge]` |
| `exchange_code(code, code_verifier)` | `str, str` | `TokenSet` dataclass |
| `refresh_access_token(refresh_token)` | `str` | `TokenSet` |
| `get_user_info(access_token)` | `str` | `dict` |
| `verify_token(jwt)` | `str` | `dict` (payload) |
| `revoke_token(refresh_token)` | `str` | `bool` |

## 5.4 FastAPI Dependency

```python
from iglobals_auth.fastapi import require_auth

@app.get("/protected")
async def protected(user=Depends(require_auth(ica))):
    return {"user_id": user["sub"]}
```

## 5.5 Flask Decorator

```python
from iglobals_auth.flask import auth_required

@app.route("/protected")
@auth_required(ica)
def protected():
    from flask import g
    return jsonify({"user_id": g.ica_user["sub"]})
```

---

# Phase 6 — Project Scaffolding

## 6.1 Repository Structure

```
iglobals-central-auth/
├── package.json                   -- workspace root (npm workspaces)
├── .env.example
├── docker-compose.yml             -- local dev: postgres (or point to Neon)
├── scripts/
│   ├── migrate.js                 -- runs SQL migration files in order
│   ├── generate-keys.js           -- generates RSA key pair, prints PEM for .env
│   └── seed-client.js             -- inserts a test oauth_client row
│
├── api/                           -- Express backend
│   ├── package.json
│   ├── src/
│   │   ├── index.js               -- entry point: creates Express app, starts server
│   │   ├── app.js                 -- configures middleware, mounts routers
│   │   │
│   │   ├── config/
│   │   │   └── index.js           -- reads .env, exports typed config object
│   │   │
│   │   ├── db/
│   │   │   ├── pool.js            -- creates pg.Pool from DATABASE_URL, exports it
│   │   │   └── queries/
│   │   │       ├── users.js
│   │   │       ├── oauth_clients.js
│   │   │       ├── authorization_codes.js
│   │   │       ├── refresh_tokens.js
│   │   │       ├── user_consents.js
│   │   │       ├── ica_sessions.js
│   │   │       ├── email_verifications.js
│   │   │       ├── phone_verifications.js
│   │   │       ├── password_resets.js
│   │   │       └── audit_log.js
│   │   │
│   │   ├── lib/
│   │   │   ├── crypto.js          -- PKCE helpers, random token gen, SHA-256, bcrypt wrappers
│   │   │   ├── jwt.js             -- sign/verify access tokens and ID tokens (RS256)
│   │   │   ├── jwks.js            -- builds and caches JWKS response from public key
│   │   │   ├── session.js         -- create/read/revoke ica_sessions, set cookie helpers
│   │   │   ├── mailer.js          -- sends email via SMTP (nodemailer), templates for OTP/reset
│   │   │   ├── sms.js             -- sends SMS via Twilio (or Termii for NG numbers)
│   │   │   └── rateLimit.js       -- express-rate-limit factory with Redis or memory store
│   │   │
│   │   ├── middleware/
│   │   │   ├── requireIcaSession.js   -- reads ica_session cookie, attaches req.sessionUser
│   │   │   ├── requireAdminJwt.js     -- verifies admin JWT, attaches req.adminUser
│   │   │   ├── validateBody.js        -- Joi/Zod schema validator factory
│   │   │   └── errorHandler.js        -- global Express error handler, formats error response
│   │   │
│   │   └── routes/
│   │       ├── oauth/
│   │       │   ├── authorize.js
│   │       │   ├── token.js
│   │       │   ├── revoke.js
│   │       │   ├── userinfo.js
│   │       │   ├── jwks.js
│   │       │   └── discovery.js
│   │       ├── auth/
│   │       │   ├── register.js
│   │       │   ├── login.js
│   │       │   ├── logout.js
│   │       │   ├── verifyEmail.js
│   │       │   ├── verifyPhone.js
│   │       │   ├── sendEmailVerification.js
│   │       │   ├── sendPhoneVerification.js
│   │       │   ├── forgotPassword.js
│   │       │   ├── resetPassword.js
│   │       │   ├── me.js
│   │       │   ├── updateMe.js
│   │       │   ├── changePassword.js
│   │       │   ├── sessions.js
│   │       │   └── apps.js
│   │       └── admin/
│   │           ├── login.js
│   │           ├── clients.js
│   │           └── users.js
│
├── web/                           -- Next.js 14 App Router frontend
│   ├── package.json
│   ├── next.config.js             -- rewrites /api/* to Express (or same server)
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── consent/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   ├── verify-phone/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── profile/page.tsx
│   │       ├── security/page.tsx
│   │       └── apps/page.tsx
│   ├── components/
│   │   ├── ui/                    -- Button, Input, Card, Badge, Alert
│   │   ├── AuthForm.tsx           -- shared login/register form shell
│   │   ├── OTPInput.tsx           -- 6-digit OTP input grid
│   │   ├── ConsentCard.tsx        -- renders app name, logo, scope list
│   │   ├── SessionRow.tsx         -- session card for security page
│   │   └── AppCard.tsx            -- authorized app card for apps page
│   ├── contexts/
│   │   └── UserContext.tsx        -- React context for current ICA user
│   ├── hooks/
│   │   ├── useUser.ts             -- reads UserContext
│   │   └── useOAuthContext.ts     -- reads OAuth params from URL/sessionStorage
│   └── lib/
│       └── api.ts                 -- typed fetch wrappers for all /api/auth/* endpoints
│
├── sdk-js/                        -- @iglobals/auth-client npm package
│   ├── package.json
│   ├── src/
│   │   ├── index.ts               -- exports createIGlobalsAuth factory
│   │   ├── client.ts              -- ICAClient class with all methods
│   │   ├── pkce.ts                -- generatePKCE()
│   │   ├── jwks.ts                -- JWKS fetch + cache + JWT verify
│   │   ├── middleware.ts          -- requireAuth, optionalAuth Express factories
│   │   ├── errors.ts              -- ICAError class
│   │   └── types.ts               -- TypeScript interfaces
│   └── tsconfig.json
│
└── sdk-py/                        -- iglobals-auth PyPI package
    ├── setup.py / pyproject.toml
    ├── iglobals_auth/
    │   ├── __init__.py            -- exports IGlobalsAuth class
    │   ├── client.py              -- IGlobalsAuth class
    │   ├── pkce.py                -- generate_pkce()
    │   ├── jwks.py                -- JWKS fetch + cache + JWT verify (PyJWT)
    │   ├── errors.py              -- ICAError exception
    │   ├── types.py               -- TokenSet dataclass, UserInfoClaims TypedDict
    │   ├── fastapi.py             -- require_auth FastAPI dependency factory
    │   └── flask.py               -- auth_required Flask decorator factory
    └── tests/
```

---

## 6.2 File-by-File Function Inventory

### `api/src/db/queries/users.js`

| Function | Accepts | DB Operation | Returns |
|---|---|---|---|
| `createUser({ email, password_hash, first_name, last_name, phone })` | object | INSERT into `ica.users` | `User` row |
| `getUserById(id)` | `uuid string` | SELECT by `id` | `User \| null` |
| `getUserByEmail(email)` | `string` | SELECT by `email` (CITEXT) | `User \| null` |
| `updateUser(id, fields)` | `uuid, object` | UPDATE `ica.users` SET ... WHERE id | `User` |
| `setEmailVerified(userId)` | `uuid` | UPDATE `email_verified = true` | void |
| `setPhoneVerified(userId)` | `uuid` | UPDATE `phone_verified = true` | void |
| `setPassword(userId, hash)` | `uuid, string` | UPDATE `password_hash` | void |
| `setActive(userId, bool)` | `uuid, boolean` | UPDATE `is_active` | void |

---

### `api/src/db/queries/oauth_clients.js`

| Function | Accepts | DB Operation | Returns |
|---|---|---|---|
| `getClientById(clientId)` | `string` | SELECT by `client_id` | `OAuthClient \| null` |
| `createClient(fields)` | object | INSERT | `OAuthClient` |
| `updateClient(clientId, fields)` | `string, object` | UPDATE | `OAuthClient` |
| `rotateSecret(clientId, newHash)` | `string, string` | UPDATE `client_secret_hash` | void |
| `listClients()` | — | SELECT all `is_active` | `OAuthClient[]` |

---

### `api/src/db/queries/authorization_codes.js`

| Function | Accepts | DB Operation | Returns |
|---|---|---|---|
| `createCode({ code, client_id, user_id, scopes, redirect_uri, code_challenge })` | object | INSERT | `AuthCode` row |
| `getCode(code)` | `string` | SELECT by `code` | `AuthCode \| null` |
| `markCodeUsed(id)` | `uuid` | UPDATE `used_at = NOW()` | void |
| `deleteExpiredCodes()` | — | DELETE WHERE `expires_at < NOW()` | void |

---

### `api/src/db/queries/refresh_tokens.js`

| Function | Accepts | DB Operation | Returns |
|---|---|---|---|
| `createToken({ token_hash, client_id, user_id, scopes, expires_at })` | object | INSERT | `RefreshToken` row |
| `getTokenByHash(hash)` | `string` | SELECT by `token_hash` | `RefreshToken \| null` |
| `revokeToken(id)` | `uuid` | UPDATE `revoked_at = NOW()` | void |
| `revokeAllForUserClient(userId, clientId)` | `uuid, string` | UPDATE all matching | void |
| `updateLastUsed(id)` | `uuid` | UPDATE `last_used_at = NOW()` | void |

---

### `api/src/db/queries/ica_sessions.js`

| Function | Accepts | DB Operation | Returns |
|---|---|---|---|
| `createSession({ token_hash, user_id, user_agent, ip_address, remember_me })` | object | INSERT | `IcaSession` |
| `getSessionByHash(hash)` | `string` | SELECT WHERE `revoked_at IS NULL AND expires_at > NOW()` | `IcaSession \| null` |
| `revokeSession(id)` | `uuid` | UPDATE `revoked_at = NOW()` | void |
| `revokeAllUserSessions(userId)` | `uuid` | UPDATE all for user | void |
| `listUserSessions(userId)` | `uuid` | SELECT active sessions | `IcaSession[]` |
| `touchSession(id)` | `uuid` | UPDATE `last_active_at = NOW()` | void |

---

### `api/src/lib/crypto.js`

| Function | Accepts | Calls | Returns |
|---|---|---|---|
| `hashPassword(plain)` | `string` | `bcrypt.hash(plain, 12)` | `Promise<string>` |
| `verifyPassword(plain, hash)` | `string, string` | `bcrypt.compare` | `Promise<boolean>` |
| `generateToken(bytes?)` | `number=32` | `crypto.randomBytes` | `string` (hex) |
| `sha256(data)` | `string` | `crypto.createHash('sha256')` | `string` (hex) |
| `base64urlEncode(buf)` | `Buffer` | `buf.toString('base64url')` | `string` |
| `generateOTP()` | — | `crypto.randomInt(100000, 999999)` | `string` 6 digits |
| `hashOTP(otp)` | `string` | `bcrypt.hash(otp, 10)` | `Promise<string>` |
| `verifyOTP(otp, hash)` | `string, string` | `bcrypt.compare` | `Promise<boolean>` |
| `pkceChallenge(verifier)` | `string` | SHA-256 then base64url | `string` |

---

### `api/src/lib/jwt.js`

| Function | Accepts | Calls | Returns |
|---|---|---|---|
| `signAccessToken({ sub, aud, scope, email, email_verified })` | object | `jsonwebtoken.sign` with RS256 private key, `exp: 900s` | `string` |
| `signIdToken({ sub, aud, claims })` | object | `jsonwebtoken.sign` with RS256 private key, `exp: 3600s` | `string` |
| `verifyToken(jwt, expectedAud)` | `string, string` | `jsonwebtoken.verify` with public key | `JWTPayload` |
| `decodeTokenUnsafe(jwt)` | `string` | `jsonwebtoken.decode` (no verify) | `JWTPayload \| null` |

---

### `api/src/lib/session.js`

| Function | Accepts | Calls | Returns |
|---|---|---|---|
| `createIcaSession(req, res, userId, rememberMe)` | `req, res, uuid, bool` | `generateToken()`, `sha256()`, `createSession()` in db, sets `ica_session` cookie | `IcaSession` |
| `readIcaSession(req)` | `req` | reads `req.cookies.ica_session`, calls `sha256()`, then `getSessionByHash()` | `IcaSession \| null` |
| `destroyIcaSession(req, res)` | `req, res` | `revokeSession()` in db, clears cookie | void |
| `setCookie(res, token, rememberMe)` | `res, string, bool` | `res.cookie('ica_session', ...)` with correct flags | void |
| `clearCookie(res)` | `res` | `res.clearCookie('ica_session')` | void |

---

### `api/src/routes/oauth/authorize.js`

**Handler:** `GET /api/oauth/authorize`

Logic steps performed by this file:
1. Parse and validate all query params (client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method).
2. Call `getClientById(client_id)` — 400 if not found or inactive.
3. Verify `redirect_uri` is in `client.redirect_uris` — 400 if not (direct HTTP error, no redirect).
4. Verify `response_type === 'code'` — redirect error if not.
5. Verify all requested scopes are in `client.allowed_scopes` — redirect error if not.
6. Call `readIcaSession(req)` to check for active SSO session.
7. If no session: store OAuth params in a signed, short-lived server-side record (or encode in the `/login` redirect URL), redirect to `/login?oauth=1&...params`.
8. If session: check `getConsentByUserClient(userId, clientId)` and whether all requested scopes are covered.
9. If new scopes: redirect to `/consent?...params`.
10. If all consented: call `generateToken(32)` for code, `createCode({...})` in db, redirect to `redirect_uri?code=...&state=...`.
11. Write `oauth.code.issued` to audit_log.

---

### `api/src/routes/oauth/token.js`

**Handler:** `POST /api/oauth/token`

For `authorization_code` grant:
1. Validate body fields present.
2. Call `getClientById(client_id)`, verify `client_secret` via `verifyPassword(secret, client.client_secret_hash)`.
3. Call `getCode(code)` — 400 if null, expired (`expires_at < NOW()`), or `used_at` is not null.
4. Verify `redirect_uri` matches `code.redirect_uri`.
5. Verify PKCE: compute `pkceChallenge(code_verifier)`, compare to `code.code_challenge`.
6. Call `markCodeUsed(code.id)`.
7. Call `signAccessToken({ sub: code.user_id, aud: client_id, scope, email, email_verified })` — fetches user from db first.
8. Call `signIdToken({ sub, aud, claims })` — includes only claims for granted scopes.
9. Call `generateToken(32)` for refresh token raw value, `sha256(raw)` for hash, `createToken({...})` in db.
10. Write `oauth.code.exchanged` to audit_log.
11. Return token response.

For `refresh_token` grant:
1. Validate body, verify client credentials.
2. `sha256(refresh_token)` → `getTokenByHash(hash)`.
3. If not found: 400.
4. If `revoked_at` is not null: REPLAY DETECTED → `revokeAllForUserClient(userId, clientId)` → 400.
5. If `expires_at < NOW()`: 400.
6. If client_id mismatch: 400.
7. Revoke old token: `revokeToken(id)`.
8. Issue new refresh token: `generateToken(32)`, `sha256`, `createToken`.
9. Issue new access token: `signAccessToken(...)`.
10. Update `last_used_at` (on new token).
11. Write `oauth.token.refreshed` to audit_log.
12. Return response.

---

### `api/src/routes/auth/register.js`

**Handler:** `POST /api/auth/register`

1. Validate body (email, password strength, first_name, last_name required).
2. `getUserByEmail(email)` — 409 if exists.
3. If `oauth_context` present: validate client and redirect_uri.
4. `hashPassword(password)` → `createUser({...})`.
5. `createIcaSession(req, res, user.id, false)`.
6. If `oauth_context`: record consent for requested scopes (`createConsent`), generate auth code (`createCode`), build redirect URL.
7. Send email verification OTP: `generateOTP()`, `hashOTP()`, `createEmailVerification({...})`, `mailer.sendOTP(email, otp)`.
8. Write `user.registered` to audit_log.
9. Return `{ user_id, email, redirect_to }`.

---

## 6.3 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@neon-host/ica_db?sslmode=require

# JWT Keys (PEM strings, generate with scripts/generate-keys.js)
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
JWT_KID=key-1

# Session
SESSION_SECRET=64-random-hex-chars    # for signing session tokens

# App
ICA_BASE_URL=https://auth.iglobals.com
NODE_ENV=production
PORT=3001

# Email (SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM=noreply@iglobals.com

# SMS (Termii recommended for Nigerian numbers)
TERMII_API_KEY=...
TERMII_SENDER_ID=iGlobals

# Admin
ADMIN_JWT_SECRET=64-random-hex-chars

# Rate Limiting (optional Redis, falls back to in-memory)
REDIS_URL=redis://...
```

---

## 6.4 Key Security Rules (Implementation Checklist)

Every item below must be verified before considering the system production-ready.

- `ica_session` cookie is always `HttpOnly`, `Secure`, `SameSite=Lax`.
- `client_secret` is hashed with bcrypt before storage; raw value logged nowhere.
- Refresh tokens are stored as `SHA-256` hashes; raw value sent once to client, never stored plain.
- Authorization codes are single-use; `used_at` checked before exchange.
- PKCE `code_challenge` verified on every code exchange, no exceptions.
- `state` parameter validated by client apps (enforced in SDK helpers).
- `redirect_uri` comparison is exact string match, no pattern matching, no trailing slash tolerance.
- Replay detection on refresh tokens: revoked token reuse triggers full session wipe for that `(user, client)`.
- JWT signing algorithm is RS256; HS256 is never used (shared secrets between services are a risk vector).
- Access token lifetime: 900 seconds (15 minutes). Refresh token lifetime: 30 days. ICA session: 24h normal / 30d remember-me.
- Rate limits: login attempts 10/15min/IP, OTP submission 5/request, token endpoint 60/min/client.
- `audit_log` is append-only; no DELETE or UPDATE on this table from application code.
- All admin endpoints require a separate admin JWT; ICA session cookie alone is not sufficient.
- HTTPS enforced at reverse proxy; HTTP requests redirected to HTTPS.
- CORS on the Express API: only `https://auth.iglobals.com` origin is allowed for cookie-based endpoints; token/JWKS/discovery endpoints are open (they are public by spec).
