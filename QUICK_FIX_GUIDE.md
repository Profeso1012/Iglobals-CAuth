# Quick Fix: JWT Issuer Mismatch

## 🚨 The Problem

Your OAuth flow is failing with:
```
jwt.exceptions.InvalidIssuerError: Invalid issuer
Token issuer is: http://localhost:3000
```

## ✅ The Solution (2 minutes)

### Option 1: Fix in Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Open project: `iglobals-c-auth-web`
3. Go to: **Settings** → **Environment Variables**
4. Add/Update these two variables:

   ```
   NEXT_PUBLIC_BASE_URL = https://iglobals-c-auth-web.vercel.app
   ICA_BASE_URL = https://iglobals-c-auth-web.vercel.app
   ```

5. Click **Save**
6. Go to **Deployments** → Click **Redeploy** on the latest deployment

### Option 2: Fix via Command Line

```bash
vercel env add NEXT_PUBLIC_BASE_URL production
# Enter: https://iglobals-c-auth-web.vercel.app

vercel env add ICA_BASE_URL production  
# Enter: https://iglobals-c-auth-web.vercel.app

vercel --prod
```

## 🧪 Verify the Fix

After redeployment, run:

```bash
node scripts/verify-deployment.js https://iglobals-c-auth-web.vercel.app
```

Or manually check:
```bash
curl https://iglobals-c-auth-web.vercel.app/api/oauth/.well-known/openid-configuration
```

The `issuer` field should show `https://iglobals-c-auth-web.vercel.app`, **NOT** `http://localhost:3000`.

## 🎉 Test OAuth Flow

Once fixed, your login flow will work:

1. User clicks "Login" in iPod Test App
2. Redirects to ICA login page
3. User logs in and grants consent
4. Returns to iPod app with valid token
5. **JWT verification passes** ✅
6. User successfully logged in!

## 📚 More Details

See [VERCEL_DEPLOYMENT_FIX.md](./VERCEL_DEPLOYMENT_FIX.md) for complete documentation.

## ❓ Why This Happened

The code uses:
```typescript
baseUrl: process.env.NEXT_PUBLIC_BASE_URL || process.env.ICA_BASE_URL || 'http://localhost:3000'
```

Without the environment variables set in Vercel, it defaults to `localhost:3000`, which is used as the JWT issuer. Your Python SDK correctly rejects tokens with mismatched issuers for security.

**Your code is correct** - this is purely a deployment configuration issue! 🎯
