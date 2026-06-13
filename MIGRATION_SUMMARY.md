# Migration to Single Next.js Deployment - Summary

## What Changed

### Before: Separate API and Frontend
- **API**: Express.js server on port 3001 (`api/`)
- **Frontend**: Next.js on port 3000 (`web/`)
- **Deployment**: Two separate services
- **Communication**: Frontend proxied requests to backend

### After: Single Next.js Application
- **Combined**: Single Next.js app with API routes
- **Location**: Everything in `web/`
- **Deployment**: One URL (e.g., `https://auth.yourdomain.com`)
- **API Routes**: `/api/oauth/*`, `/api/auth/*`, `/api/admin/*`

## Migration Progress

### ✅ Completed

1. **Dependencies Added** to `web/package.json`:
   - `bcrypt`, `joi`, `jsonwebtoken`, `pg`, `helmet`, `dotenv`, `cookie-parser`

2. **Database Layer Migrated** (`web/src/lib/db/`):
   - `pool.ts` - PostgreSQL connection
   - `queries/users.ts`
   - `queries/oauth_clients.ts`
   - `queries/authorization_codes.ts`
   - `queries/refresh_tokens.ts`
   - `queries/email_verifications.ts`
   - `queries/phone_verifications.ts`
   - `queries/password_resets.ts`
   - `queries/ica_sessions.ts`
   - `queries/user_consents.ts`
   - `queries/audit_log.ts`

3. **Utility Libraries Migrated** (`web/src/lib/`):
   - `config.ts` - Environment configuration
   - `crypto.ts` - Password hashing, token generation, PKCE
   - `jwt.ts` - JWT signing and verification
   - `jwks.ts` - JWKS endpoint support
   - `mailer.ts` - Email sending
   - `sms.ts` - SMS sending
   - `session.ts` - Session management for Next.js
   - `validation.ts` - Joi schemas
   - `api-helpers.ts` - Next.js API route helpers

4. **OAuth API Routes Created** (`web/src/app/api/oauth/`):
   - `token/route.ts` - Token exchange and refresh
   - `jwks/route.ts` - JWKS endpoint
   - `userinfo/route.ts` - User info endpoint
   - `revoke/route.ts` - Token revocation
   - `.well-known/openid-configuration/route.ts` - OIDC discovery

5. **Documentation Updated**:
   - `README.md` - New architecture explanation
   - `sdk-js/README.md` - Complete JavaScript SDK guide
   - `sdk-py/README.md` - Complete Python SDK guide
   - `INTEGRATION_GUIDE.md` - Updated for single deployment

### 🚧 Still TODO

1. **Remaining API Routes** (auth, admin):
   - `/api/auth/login`
   - `/api/auth/register`
   - `/api/auth/me`
   - `/api/auth/logout`
   - `/api/auth/change-password`
   - `/api/auth/forgot-password`
   - `/api/auth/reset-password`
   - `/api/auth/verify-email`
   - `/api/auth/verify-phone`
   - `/api/auth/sessions`
   - `/api/admin/*` routes

2. **OAuth Authorize & Consent Routes**:
   - `/api/oauth/authorize`
   - `/api/oauth/consent`

3. **Environment Configuration**:
   - Create `.env.local` template
   - Add Vercel deployment guide

4. **Testing**:
   - Test OAuth flow end-to-end
   - Test SDK integration
   - Verify database connections

5. **Cleanup**:
   - Remove old `api/` folder (after verification)
   - Update GitHub Actions workflows
   - Update Docker configs if needed

## SDK Compatibility

### ✅ No Changes Needed!

The SDKs already work perfectly with the new architecture:

**JavaScript SDK** (`@iglobals/auth-client`):
```typescript
const client = new ICAClient({
  baseUrl: 'https://auth.yourdomain.com',  // Single URL
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://yourapp.com/callback'
});
```

**Python SDK** (`iglobals-auth`):
```python
client = IGlobalsAuth(
    base_url='https://auth.yourdomain.com',  # Single URL
    client_id='your-client-id',
    client_secret='your-client-secret',
    redirect_uri='https://yourapp.com/callback'
)
```

### How SDKs Work

1. SDK initialized with `baseUrl` pointing to your deployment
2. All API calls go to `/api/oauth/*` routes on your Next.js server
3. No environment variables needed in SDK - just runtime `baseUrl`
4. Works on systems without access to the repo - just the live URL

## Deployment Guide

### Vercel (Recommended)

```bash
# 1. Navigate to web directory
cd web

# 2. Install dependencies
npm install

# 3. Set environment variables in Vercel dashboard
# (see web/.env.example)

# 4. Deploy
vercel deploy --prod
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# JWT Keys
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
JWT_KID=unique-key-id

# Session
SESSION_SECRET=random-secret

# App
NEXT_PUBLIC_BASE_URL=https://auth.yourdomain.com
ICA_BASE_URL=https://auth.yourdomain.com

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com

# SMS (optional)
TERMII_API_KEY=your-key
TERMII_SENDER_ID=YourApp

# Admin
ADMIN_JWT_SECRET=random-secret
ADMIN_SECRET=admin-password
```

## Benefits of Single Deployment

1. **Simpler Architecture**: One codebase, one deployment
2. **Lower Costs**: One server instead of two
3. **Easier to Scale**: Vercel handles scaling automatically
4. **Better DX**: No CORS issues, no proxy configuration
5. **Consistent Types**: Shared TypeScript types between frontend and API
6. **Faster Development**: Hot reload for entire stack
7. **Single URL**: Easier for users and integrations

## Next Steps

1. Complete remaining API routes migration
2. Test end-to-end OAuth flow
3. Deploy to staging environment
4. Test SDK integration with sample apps
5. Update CI/CD pipelines
6. Remove old `api/` folder
7. Deploy to production

## Questions?

Refer to:
- `README.md` - Project overview
- `INTEGRATION_GUIDE.md` - Integration instructions
- `sdk-js/README.md` - JavaScript SDK docs
- `sdk-py/README.md` - Python SDK docs
