# OAuth and Auth Flow Fixes

## Problem
The application was trying to proxy requests to a separate Node.js API on port 3001 that no longer exists. The system has been migrated to a fully Next.js-based architecture where all API routes are handled through Next.js API routes.

## Root Cause
- Environment variable `PORT=3001` was configured in `.env.local`
- Multiple API endpoints were missing that the frontend was calling
- The OAuth flow was incomplete

## Changes Made

### 1. Environment Configuration
**Files Modified:**
- `web/.env.local` - Removed `PORT=3001` variable

### 2. Core Auth API Endpoints Created

#### `/api/auth/me` - User Profile
- **GET**: Get current authenticated user's profile
- **PATCH**: Update user profile (name, phone)
- File: `web/src/app/api/auth/me/route.ts`

#### `/api/auth/logout` - Logout
- **POST**: Logout user (supports single or global logout)
- File: `web/src/app/api/auth/logout/route.ts`

#### `/api/auth/register` - User Registration
- **POST**: Register new user account
- Automatically creates email verification
- Sends welcome email with OTP
- File: `web/src/app/api/auth/register/route.ts`

#### `/api/auth/change-password` - Password Change
- **POST**: Change user password (requires current password)
- File: `web/src/app/api/auth/change-password/route.ts`

#### `/api/auth/reset-password` - Password Reset
- **POST**: Reset password using token from email
- File: `web/src/app/api/auth/reset-password/route.ts`

### 3. Session Management Endpoints

#### `/api/auth/sessions` - List Sessions
- **GET**: Get all active sessions for current user
- File: `web/src/app/api/auth/sessions/route.ts`

#### `/api/auth/sessions/[id]` - Revoke Session
- **DELETE**: Revoke a specific session by ID
- File: `web/src/app/api/auth/sessions/[id]/route.ts`

### 4. Verification Endpoints

#### Email Verification
- **POST** `/api/auth/verify-email` - Verify email with OTP
- **POST** `/api/auth/send-email-verification` - Send new verification OTP
- Files: 
  - `web/src/app/api/auth/verify-email/route.ts`
  - `web/src/app/api/auth/send-email-verification/route.ts`

#### Phone Verification
- **POST** `/api/auth/verify-phone` - Verify phone with OTP
- **POST** `/api/auth/send-phone-verification` - Send new verification OTP
- Files:
  - `web/src/app/api/auth/verify-phone/route.ts`
  - `web/src/app/api/auth/send-phone-verification/route.ts`

### 5. OAuth App Management

#### `/api/auth/apps` - Authorized Apps
- **GET**: List all apps user has authorized
- File: `web/src/app/api/auth/apps/route.ts`

#### `/api/auth/apps/[clientId]` - Revoke App
- **DELETE**: Revoke consent for specific app
- File: `web/src/app/api/auth/apps/[clientId]/route.ts`

### 6. OAuth Flow Endpoints

#### `/api/oauth/authorize` - OAuth Authorization
- **GET**: Entry point for OAuth 2.0 authorization flow
- Handles login redirect if not authenticated
- Handles consent if not previously granted
- Auto-grants if consent already exists
- File: `web/src/app/api/oauth/authorize/route.ts`

#### `/api/oauth/consent` - OAuth Consent
- **POST**: Process user's allow/deny decision for OAuth consent
- Creates authorization code on approval
- File: `web/src/app/api/oauth/consent/route.ts`

### 7. Helper Libraries Created/Updated

#### Email Helper
- New file: `web/src/lib/email.ts`
- Uses nodemailer with SMTP configuration
- Provides `sendEmail()` function

#### SMS Helper
- Updated file: `web/src/lib/sms.ts`
- Added Termii API integration
- Provides `sendSMS()` and `sendOTP()` functions
- Falls back to console logging in dev mode

### 8. Dependencies Added
```json
{
  "dependencies": {
    "nodemailer": "^7.0.0"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/pg": "^8.0.0"
  }
}
```

## OAuth 2.0 Flow (Complete)

### 1. Authorization Request
```
GET /api/oauth/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  scope=openid profile email&
  state=STATE&
  code_challenge=CHALLENGE
```

**Flow:**
1. Validates client and redirect URI
2. If not logged in → redirects to `/login` with OAuth context
3. If logged in but no consent → redirects to `/consent`
4. If logged in and has consent → generates code and redirects to app

### 2. Login with OAuth Context
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "oauth_context": {
    "client_id": "...",
    "redirect_uri": "...",
    "state": "...",
    "code_challenge": "..."
  }
}
```

**Response:** Redirects to consent page

### 3. Consent Decision
```
POST /api/oauth/consent
{
  "client_id": "CLIENT_ID",
  "redirect_uri": "REDIRECT_URI",
  "state": "STATE",
  "code_challenge": "CHALLENGE",
  "scopes": ["openid", "profile", "email"],
  "decision": "allow"
}
```

**Response:** Returns redirect URL with authorization code

### 4. Token Exchange
```
POST /api/oauth/token
{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "redirect_uri": "REDIRECT_URI",
  "client_id": "CLIENT_ID",
  "client_secret": "CLIENT_SECRET",
  "code_verifier": "VERIFIER"
}
```

**Response:** Returns access_token, id_token, refresh_token

### 5. Get User Info
```
GET /api/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN
```

**Response:** User profile data based on granted scopes

## Testing the Fixes

### 1. Start the Application
```bash
cd web
npm run dev
```

The app should now start on **port 3000** (default Next.js port) without trying to connect to port 3001.

### 2. Test User Registration
- Navigate to `/register`
- Create a new account
- Should redirect to email verification

### 3. Test Login
- Navigate to `/login`
- Login with credentials
- Should redirect to `/dashboard`

### 4. Test Dashboard
- Dashboard should load without errors
- Profile, sessions, and apps sections should work

### 5. Test OAuth Flow
- Use the authorize endpoint with a valid client_id
- Should prompt for login (if not logged in) → consent → return auth code

## Environment Variables Required

Ensure these are set in `web/.env.local`:

```env
# Database
DATABASE_URL=postgresql://...

# JWT Keys
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
JWT_KID=key-1

# Session
SESSION_SECRET=your-session-secret

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ICA_BASE_URL=http://localhost:3000
NODE_ENV=development

# Email (Optional for development)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your-password
SMTP_FROM=noreply@iglobals.com

# SMS (Optional for development)
TERMII_API_KEY=your-api-key
TERMII_SENDER_ID=iGlobals

# Admin
ADMIN_JWT_SECRET=admin-secret

# Redis (Optional)
REDIS_URL=redis://...
```

## What Was Fixed

✅ Removed port 3001 configuration  
✅ Created all missing auth API endpoints  
✅ Created all missing OAuth endpoints  
✅ Implemented complete OAuth 2.0 authorization code flow with PKCE  
✅ Added email sending capability  
✅ Added SMS sending capability (Termii integration)  
✅ Fixed session management  
✅ Fixed user profile management  
✅ Fixed app consent management  
✅ All routes now use Next.js API routes (no external API server needed)  

## Next Steps

1. **Test all endpoints** - Use the dashboard to test each feature
2. **Set up email provider** - Configure real SMTP credentials for production
3. **Set up SMS provider** - Configure Termii API key for phone verification
4. **Add rate limiting** - Implement rate limiting for sensitive endpoints
5. **Add CSRF protection** - Add CSRF tokens to forms
6. **Security review** - Review all endpoints for security best practices

## Architecture Summary

```
Next.js App (Port 3000)
├── Frontend Pages (/dashboard, /login, /register, etc.)
├── API Routes (/api/auth/*, /api/oauth/*)
├── Database (PostgreSQL via connection pool)
├── Email Service (nodemailer + SMTP)
└── SMS Service (Termii API)
```

All authentication and OAuth flows are now self-contained within the Next.js application. No separate backend API server is needed.
