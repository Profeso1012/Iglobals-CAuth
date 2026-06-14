# Fix: JWT Issuer Mismatch on Vercel

## Problem

The ICA server deployed on Vercel at `https://iglobals-c-auth-web.vercel.app` is generating JWT tokens with the issuer (`iss` claim) set to `http://localhost:3000` instead of the production URL.

This causes the Python SDK to reject tokens with:
```
jwt.exceptions.InvalidIssuerError: Invalid issuer
```

## Root Cause

The `config.baseUrl` in the ICA server is falling back to the default `http://localhost:3000` because the environment variables `NEXT_PUBLIC_BASE_URL` or `ICA_BASE_URL` are **not set** in Vercel.

Looking at the config file:
```typescript
baseUrl: process.env.NEXT_PUBLIC_BASE_URL || process.env.ICA_BASE_URL || 'http://localhost:3000',
```

Without the environment variables, it defaults to `localhost:3000`.

## Solution: Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard

1. Open your browser and go to: https://vercel.com/dashboard
2. Select your project: `iglobals-c-auth-web`
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

### Step 2: Add Required Environment Variables

Add the following environment variables (if not already set):

#### **CRITICAL - Must be set correctly:**

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_BASE_URL` | `https://iglobals-c-auth-web.vercel.app` | Production, Preview, Development |
| `ICA_BASE_URL` | `https://iglobals-c-auth-web.vercel.app` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

**Note:** Use your actual Vercel deployment URL. If you have a custom domain, use that instead.

#### **Other Required Variables (if not set):**

Make sure these are also configured:

- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_PRIVATE_KEY` - Your RSA private key (multiline)
- `JWT_PUBLIC_KEY` - Your RSA public key (multiline)
- `JWT_KID` - Unique key identifier
- `SESSION_SECRET` - Random 64-character secret
- `ADMIN_JWT_SECRET` - Random secret for admin JWT
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (for emails)
- `TERMII_API_KEY`, `TERMII_SENDER_ID` (for SMS, if used)

### Step 3: Redeploy

After adding/updating the environment variables:

1. Click **Save**
2. Go to the **Deployments** tab
3. Click the three dots (•••) on the latest deployment
4. Click **Redeploy**
5. Select **Use existing Build Cache** (optional, faster)
6. Click **Redeploy**

**OR** push a new commit to trigger automatic deployment:
```bash
git commit --allow-empty -m "Trigger redeploy with updated env vars"
git push
```

### Step 4: Verify the Fix

After redeployment, test by checking the OpenID configuration:

```bash
curl https://iglobals-c-auth-web.vercel.app/api/oauth/.well-known/openid-configuration
```

**Expected response:**
```json
{
  "issuer": "https://iglobals-c-auth-web.vercel.app",
  "authorization_endpoint": "https://iglobals-c-auth-web.vercel.app/api/oauth/authorize",
  "token_endpoint": "https://iglobals-c-auth-web.vercel.app/api/oauth/token",
  ...
}
```

✅ The `issuer` field should now show the production URL, **NOT** `http://localhost:3000`!

### Step 5: Test OAuth Flow

Now try logging in from your iPod Test App again. The flow should work correctly:

1. User clicks "Login" → Redirects to ICA
2. User logs in and grants consent
3. ICA redirects back with authorization code
4. Your app exchanges code for tokens
5. **JWT verification now passes** ✅
6. User successfully logs in!

## Why This Happened

In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser, but **all environment variables** (including `NEXT_PUBLIC_*`) need to be explicitly set in Vercel's Environment Variables settings.

Unlike local development where you can use `.env.local`, Vercel doesn't automatically read from `.env.example` or `.env.local` files. You must configure them through the dashboard or CLI.

## Alternative: Set via Vercel CLI

If you prefer using the command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_BASE_URL production
# Enter: https://iglobals-c-auth-web.vercel.app

vercel env add ICA_BASE_URL production
# Enter: https://iglobals-c-auth-web.vercel.app

# Redeploy
vercel --prod
```

## Quick Checklist

- [ ] Set `NEXT_PUBLIC_BASE_URL` in Vercel to production URL
- [ ] Set `ICA_BASE_URL` in Vercel to production URL
- [ ] Redeploy the application
- [ ] Verify `/api/oauth/.well-known/openid-configuration` shows correct issuer
- [ ] Test OAuth login flow from client app
- [ ] Confirm JWT tokens are now accepted by Python SDK

## Need Help?

If you're still having issues after following these steps:

1. Check Vercel deployment logs for any errors
2. Verify all environment variables are set correctly (no typos!)
3. Make sure you redeployed after changing environment variables
4. Clear your browser cache and try again
5. Check that your OAuth client's `redirect_uris` in the database includes the correct callback URL

---

**Once this is fixed, your OAuth flow will work perfectly!** The issue is purely a configuration problem, not a code bug. Your implementation is correct. 🎉
