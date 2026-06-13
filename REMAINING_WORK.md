# Remaining Work - Auth API Routes

## ✅ Completed
- `/api/oauth/token` - Token exchange & refresh
- `/api/oauth/userinfo` - User info endpoint
- `/api/oauth/revoke` - Token revocation
- `/api/oauth/jwks` - JWKS endpoint
- `/api/oauth/.well-known/openid-configuration` - OIDC discovery
- `/api/auth/login` - Login endpoint
- Fixed cookies import error
- Fixed database connection (.env.local created)
- Fixed autofill styling
- Fixed button states

## 🚧 TODO - High Priority Auth Routes

These routes are called by the frontend and need to be created:

### 1. `/api/auth/register` - User Registration
**Used by:** `web/src/app/(auth)/register/page.tsx`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Logic:**
- Validate email format
- Check if email already exists
- Hash password with bcrypt
- Create user in database
- Send email verification OTP
- Create session
- Return success

---

### 2. `/api/auth/logout` - Logout
**Used by:** Dashboard, user menu

**Logic:**
- Get session from cookie
- Revoke session in database
- Clear cookie
- Return success

---

### 3. `/api/auth/me` - Get Current User
**Used by:** Dashboard pages

**Logic:**
- Get session from cookie
- Look up user by session
- Return user info
- Return 401 if not authenticated

---

### 4. `/api/auth/send-email-verification` - Send Email OTP
**Used by:** Verification pages

**Logic:**
- Get user from session
- Generate 6-digit OTP
- Hash OTP
- Store in email_verifications table
- Send email with OTP
- Return success

---

### 5. `/api/auth/verify-email` - Verify Email with OTP
**Used by:** Email verification page

**Request:**
```json
{
  "otp": "123456"
}
```

**Logic:**
- Get user from session
- Get latest verification record
- Check if expired (10 min)
- Verify OTP hash
- Mark user email_verified = true
- Mark verification verified_at
- Return success

---

### 6. `/api/auth/send-phone-verification` - Send Phone OTP
**Used by:** Phone verification page

**Logic:**
- Get user from session
- Generate 6-digit OTP
- Hash OTP
- Store in phone_verifications table
- Send SMS with OTP (Termii)
- Return success

---

### 7. `/api/auth/verify-phone` - Verify Phone with OTP
**Used by:** Phone verification page

**Request:**
```json
{
  "otp": "123456"
}
```

**Logic:**
- Get user from session
- Get latest phone verification
- Check if expired
- Verify OTP hash
- Mark user phone_verified = true
- Mark verification verified_at
- Return success

---

### 8. `/api/auth/forgot-password` - Request Password Reset
**Used by:** Forgot password page

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Logic:**
- Find user by email
- Generate reset token
- Hash token
- Store in password_reset_requests
- Send email with reset link
- Return success (always, even if email doesn't exist - security)

---

### 9. `/api/auth/reset-password` - Complete Password Reset
**Used by:** Reset password page with token

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Logic:**
- Hash token
- Find reset request
- Check if expired (1 hour)
- Check if already used
- Hash new password
- Update user password
- Mark reset request used
- Revoke all user sessions
- Return success

---

### 10. `/api/auth/change-password` - Change Password (Authenticated)
**Used by:** User settings page

**Request:**
```json
{
  "old_password": "current123",
  "new_password": "newpassword123"
}
```

**Logic:**
- Get user from session
- Verify old password
- Hash new password
- Update user password
- Return success

---

### 11. `/api/auth/update-me` - Update User Profile
**Used by:** User profile/settings page

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Logic:**
- Get user from session
- Validate fields
- Update user record
- Return updated user

---

### 12. `/api/auth/sessions` - List User Sessions
**Used by:** Security/sessions page

**Logic:**
- Get user from session
- Query ica_sessions for user
- Return list of active sessions

---

### 13. `/api/auth/revoke-session` - Revoke a Session
**Used by:** Security/sessions page

**Request:**
```json
{
  "session_id": "uuid"
}
```

**Logic:**
- Get user from session
- Verify session belongs to user
- Revoke session
- Return success

---

## 🚧 TODO - OAuth Routes

### 14. `/api/oauth/authorize` - OAuth Authorization Endpoint
**This is complex - redirects to login or consent**

**Query params:**
```
client_id, redirect_uri, response_type=code, 
scope, state, code_challenge, code_challenge_method
```

**Logic:**
- Validate client_id exists
- Validate redirect_uri matches
- Check if user has session
  - If not: redirect to /auth/login with OAuth context
  - If yes: check consent
- If consent given: generate auth code, redirect
- If not: redirect to /oauth/consent page

---

### 15. `/api/oauth/consent` - Handle Consent Submission
**Used by:** OAuth consent page

**Request:**
```json
{
  "client_id": "...",
  "scopes": ["openid", "profile"],
  "state": "...",
  "code_challenge": "..."
}
```

**Logic:**
- Get user from session
- Save consent to user_consents
- Generate authorization code
- Store code in authorization_codes
- Redirect to client redirect_uri with code

---

## 📁 File Organization

All new routes should go in:
```
web/src/app/api/auth/
├── login/route.ts          ✅ Done
├── register/route.ts       🚧 TODO
├── logout/route.ts         🚧 TODO
├── me/route.ts             🚧 TODO
├── change-password/route.ts 🚧 TODO
├── forgot-password/route.ts 🚧 TODO
├── reset-password/route.ts  🚧 TODO
├── send-email-verification/route.ts 🚧 TODO
├── verify-email/route.ts    🚧 TODO
├── send-phone-verification/route.ts 🚧 TODO
├── verify-phone/route.ts    🚧 TODO
├── update-me/route.ts       🚧 TODO
├── sessions/route.ts        🚧 TODO
└── revoke-session/route.ts  🚧 TODO
```

OAuth routes:
```
web/src/app/api/oauth/
├── token/route.ts           ✅ Done
├── userinfo/route.ts        ✅ Done
├── revoke/route.ts          ✅ Done
├── jwks/route.ts            ✅ Done
├── authorize/route.ts       🚧 TODO (Complex)
└── consent/route.ts         🚧 TODO
```

## 🎯 Priority Order

1. **Immediate (to make login work end-to-end):**
   - `/api/auth/register`
   - `/api/auth/me`
   - `/api/auth/logout`

2. **High (common user flows):**
   - `/api/auth/forgot-password`
   - `/api/auth/reset-password`
   - `/api/auth/change-password`

3. **Medium (verification):**
   - `/api/auth/send-email-verification`
   - `/api/auth/verify-email`
   - `/api/auth/send-phone-verification`
   - `/api/auth/verify-phone`

4. **Low (profile management):**
   - `/api/auth/update-me`
   - `/api/auth/sessions`
   - `/api/auth/revoke-session`

5. **OAuth (for third-party apps):**
   - `/api/oauth/authorize`
   - `/api/oauth/consent`

## 🚀 Quick Start

To create a new route, copy the login route pattern:

```bash
cd web/src/app/api/auth
mkdir register
# Create route.ts with the pattern from login/route.ts
```

Use the existing helper functions:
- `parseBody(req)` - Parse JSON body
- `errorResponse(error, description, status)` - Return error
- `json(data, status)` - Return JSON
- `getClientIp(req)` - Get client IP
- All database queries in `lib/db/queries/*`
- All utilities in `lib/*`

## 📝 Example Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseBody, errorResponse, json, getClientIp } from '@/lib/api-helpers';
import { getUserByEmail } from '@/lib/db/queries/users';
import { logEvent } from '@/lib/db/queries/audit_log';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req);
    if (!body) {
      return errorResponse('invalid_request', 'Invalid request body', 400);
    }

    // Your logic here

    await logEvent({
      event_type: 'auth.action',
      user_id: null,
      ip_address: getClientIp(req),
    });

    return json({ success: true });
  } catch (error) {
    console.error('Route error:', error);
    return errorResponse('server_error', 'Internal server error', 500);
  }
}
```

## ✅ Testing

After creating each route:
1. Test with browser
2. Test with Postman
3. Check database records
4. Check audit logs
5. Test error cases

## 🔍 Finding References

To see how routes are called from frontend:
```bash
# Search in web/src/app for API calls
grep -r "/api/auth/" web/src/app
```
