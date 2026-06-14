# Vercel Deployment Checklist

## ✅ Build Fix Applied

The Tailwind CSS dependencies have been moved to production dependencies to fix the build error.

**Commit:** `05672af` - "Fix: Move Tailwind dependencies to production for Vercel build"

This deployment should now build successfully!

---

## 🔧 Next Step: Set Environment Variables

After the build succeeds, you **MUST** set these environment variables in Vercel to fix the JWT issuer issue:

### Required Environment Variables

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_BASE_URL` | `https://iglobals-c-auth-web.vercel.app` | **CRITICAL** - Fixes JWT issuer |
| `ICA_BASE_URL` | `https://iglobals-c-auth-web.vercel.app` | **CRITICAL** - Fixes JWT issuer |
| `NODE_ENV` | `production` | Sets production mode |
| `DATABASE_URL` | `postgresql://...` | Your Neon/PostgreSQL URL |
| `JWT_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | From generate-keys.js |
| `JWT_PUBLIC_KEY` | `-----BEGIN PUBLIC KEY-----\n...` | From generate-keys.js |
| `JWT_KID` | `unique-key-id` | Your key identifier |
| `SESSION_SECRET` | `random-64-char-string` | Generate with crypto |
| `ADMIN_JWT_SECRET` | `random-secret` | For admin authentication |
| `SMTP_HOST` | `smtp.gmail.com` | For email verification |
| `SMTP_PORT` | `465` | SMTP port |
| `SMTP_USER` | `your-email@gmail.com` | SMTP username |
| `SMTP_PASS` | `your-app-password` | SMTP password |
| `SMTP_FROM` | `noreply@yourdomain.com` | From email address |
| `TERMII_API_KEY` | `your-api-key` | For SMS (optional) |
| `TERMII_SENDER_ID` | `YourAppName` | SMS sender ID (optional) |

### After Setting Variables

1. **Save** all environment variables
2. **Redeploy** (Vercel will do this automatically after the current build)
3. **Verify** the issuer is correct:
   ```bash
   curl https://iglobals-c-auth-web.vercel.app/api/oauth/.well-known/openid-configuration
   ```
   
   Should show:
   ```json
   {
     "issuer": "https://iglobals-c-auth-web.vercel.app",
     ...
   }
   ```

4. **Test OAuth flow** from your iPod Test App

---

## 🧪 Verification Script

After deployment, run this to verify everything:

```bash
node scripts/verify-deployment.js https://iglobals-c-auth-web.vercel.app
```

---

## 📋 Deployment Status

- [x] Fixed Tailwind build error (commit: 05672af)
- [ ] Set environment variables in Vercel
- [ ] Verify JWT issuer is correct
- [ ] Test OAuth login flow
- [ ] Confirm Python SDK accepts tokens

---

## 🐛 If Issues Persist

1. Check Vercel deployment logs for errors
2. Verify all environment variables are set (no typos!)
3. Ensure `NEXT_PUBLIC_BASE_URL` matches your actual domain
4. Clear browser cache and cookies
5. Check database connection is working
6. Verify OAuth client `redirect_uris` in database

---

## 📝 Quick Reference

**Your Deployment URL:** `https://iglobals-c-auth-web.vercel.app`

**OAuth Endpoints:**
- Authorization: `https://iglobals-c-auth-web.vercel.app/api/oauth/authorize`
- Token: `https://iglobals-c-auth-web.vercel.app/api/oauth/token`
- UserInfo: `https://iglobals-c-auth-web.vercel.app/api/oauth/userinfo`
- JWKS: `https://iglobals-c-auth-web.vercel.app/api/oauth/.well-known/jwks.json`

**Your iPod Test App Callback:** Update this in your database:
```sql
UPDATE ica.oauth_clients
SET redirect_uris = '["http://localhost:5000/callback"]'
WHERE client_id = 'ipod_itest_001';
```

---

## ✅ Success Criteria

OAuth flow is working when:
- ✅ User can click "Login" and redirect to ICA
- ✅ User can log in with credentials
- ✅ Consent page appears and shows correctly
- ✅ User clicks "Allow" and returns to iPod app
- ✅ No JWT issuer error in logs
- ✅ User is successfully logged in to iPod app

🎉 Once all steps complete, your OAuth flow will work perfectly!
