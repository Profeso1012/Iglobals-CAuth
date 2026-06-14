# OAuth Flow & Callback URL Explained

## Understanding the OAuth 2.0 Flow

### The Complete Flow Diagram

```
┌─────────────────┐                           ┌─────────────────┐
│   Your Client   │                           │  ICA Auth       │
│   Application   │                           │  Server         │
│  (using SDK)    │                           │                 │
└────────┬────────┘                           └────────┬────────┘
         │                                              │
         │ 1. User clicks "Login" button               │
         │    Generate PKCE + state                    │
         │                                              │
         │ 2. Redirect to Authorization URL            │
         │    /api/oauth/authorize?                    │
         │    client_id=your-app                       │
         │    &redirect_uri=YOUR_CALLBACK_URL          │
         │    &code_challenge=...                      │
         │    &state=...                               │
         ├─────────────────────────────────────────────>│
         │                                              │
         │                                              │ 3. User sees login page
         │                                              │    (if not logged in)
         │                                              │
         │                                              │ 4. User logs in successfully
         │                                              │
         │                                              │ 5. User sees consent page
         │                                              │    "your-app wants to access..."
         │                                              │
         │                                              │ 6. User clicks "Allow"
         │                                              │
         │ 7. ICA redirects BACK to YOUR app           │
         │    YOUR_CALLBACK_URL?                       │
         │    code=AUTH_CODE_123                       │
         │    &state=...                               │
         │<─────────────────────────────────────────────┤
         │                                              │
         │ 8. Your app receives the callback           │
         │    Extracts the "code" parameter            │
         │    Verifies state matches                   │
         │                                              │
         │ 9. Exchange code for tokens                 │
         │    POST /api/oauth/token                    │
         │    {code, code_verifier, client_id, ...}    │
         ├─────────────────────────────────────────────>│
         │                                              │
         │                                              │ 10. Verify code & PKCE
         │                                              │     Generate tokens
         │                                              │
         │ 11. Return tokens                           │
         │     {access_token, refresh_token, ...}      │
         │<─────────────────────────────────────────────┤
         │                                              │
         │ 12. Get user info                           │
         │     GET /api/oauth/userinfo                 │
         │     Authorization: Bearer ACCESS_TOKEN      │
         ├─────────────────────────────────────────────>│
         │                                              │
         │ 13. Return user profile                     │
         │     {sub, email, name, ...}                 │
         │<─────────────────────────────────────────────┤
         │                                              │
         │ 14. User is logged in!                      │
         │     Show dashboard                          │
         │                                              │
```

---

## What is the Callback URL?

### The Callback URL is YOUR application's endpoint

**IMPORTANT:** The `redirect_uri` (callback URL) is **NOT** on the ICA server. It's on **YOUR** client application!

### Example Setup:

#### ICA Server (Central Auth):
- Deployed at: `https://auth.iglobals.com`
- Provides:
  - Login page: `https://auth.iglobals.com/login`
  - Authorization endpoint: `https://auth.iglobals.com/api/oauth/authorize`
  - Token endpoint: `https://auth.iglobals.com/api/oauth/token`

#### Your Client App (e.g., iPod Test App):
- Deployed at: `http://localhost:5000`
- Has a callback route: `http://localhost:5000/auth/callback`
- When registering with ICA, you specify: `redirect_uri=http://localhost:5000/auth/callback`

### The Flow:

1. **User clicks login** on `http://localhost:5000/login`
2. **Your app redirects** user to ICA: `https://auth.iglobals.com/api/oauth/authorize?...&redirect_uri=http://localhost:5000/auth/callback`
3. **User logs in** on ICA's login page
4. **ICA redirects back** to YOUR app: `http://localhost:5000/auth/callback?code=AUTH_CODE`
5. **Your app receives** the code at `/auth/callback`
6. **Your app exchanges** code for tokens by calling ICA's token endpoint
7. **Your app stores** tokens and user is logged in

---

## How the Python SDK Uses It

```python
from iglobals_auth import IGlobalsAuth
from flask import Flask, redirect, request, session

app = Flask(__name__)

# Initialize SDK
client = IGlobalsAuth(
    base_url='https://auth.iglobals.com',      # ICA server
    client_id='ipod_itest_001',                # Your app ID
    client_secret='your-secret',               # Your app secret
    redirect_uri='http://localhost:5000/callback'  # YOUR app's callback
)

# Step 1: Login button redirects here
@app.route('/login')
def login():
    # Generate PKCE
    pkce = client.generate_pkce()
    state = str(uuid.uuid4())
    
    # Store these for later
    session['pkce_verifier'] = pkce['code_verifier']
    session['state'] = state
    
    # SDK builds URL: https://auth.iglobals.com/api/oauth/authorize?...
    auth_url = client.get_authorization_url(state, pkce['code_challenge'])
    
    # Redirect user to ICA
    return redirect(auth_url)

# Step 2: ICA redirects back to this callback
@app.route('/callback')
def callback():
    # ICA sent us: ?code=AUTH_CODE&state=STATE
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Verify state (CSRF protection)
    if state != session.get('state'):
        return 'Invalid state', 400
    
    # SDK exchanges code for tokens
    # Behind the scenes: POST https://auth.iglobals.com/api/oauth/token
    verifier = session.get('pkce_verifier')
    tokens = client.exchange_code(code, verifier)
    
    # SDK gets user info
    # Behind the scenes: GET https://auth.iglobals.com/api/oauth/userinfo
    user_info = client.get_user_info(tokens.access_token)
    
    # Store user in session
    session['user'] = user_info.dict()
    session['access_token'] = tokens.access_token
    
    # Redirect to your app's dashboard
    return redirect('/dashboard')

@app.route('/dashboard')
def dashboard():
    user = session.get('user')
    if not user:
        return redirect('/login')
    return f"Welcome, {user['email']}!"
```

---

## Common OAuth 400 Errors & Solutions

### 1. "Redirect URI Mismatch"

**Error:**
```json
{
  "error": "invalid_request",
  "error_description": "Invalid redirect URI"
}
```

**Cause:** The `redirect_uri` in your authorization request doesn't match what's registered in the OAuth client.

**Solution:**
```sql
-- Check registered URIs
SELECT redirect_uris FROM ica.oauth_clients WHERE client_id = 'ipod_itest_001';

-- Update if needed (must be exact match, including trailing slashes)
UPDATE ica.oauth_clients 
SET redirect_uris = '["http://localhost:5000/callback"]'
WHERE client_id = 'ipod_itest_001';
```

**Important:** URLs must match EXACTLY:
- ✅ `http://localhost:5000/callback` matches `http://localhost:5000/callback`
- ❌ `http://localhost:5000/callback/` does NOT match `http://localhost:5000/callback`
- ❌ `https://localhost:5000/callback` does NOT match `http://localhost:5000/callback`

---

### 2. "Missing Required Parameters"

**Error:**
```json
{
  "error": "invalid_request",
  "error_description": "Missing or invalid parameters"
}
```

**Cause:** Required OAuth parameters are missing from the authorize request.

**Required Parameters:**
- `client_id` - Your OAuth client ID
- `redirect_uri` - Your callback URL
- `response_type=code` - Must be "code" for authorization code flow
- `scope` - At minimum "openid"
- `code_challenge` - For PKCE (recommended)
- `code_challenge_method=S256` - Hash method for PKCE
- `state` - Random string for CSRF protection (recommended)

**SDK automatically includes these** - if you're getting this error with the SDK, check:
```python
# Verify SDK initialization
client = IGlobalsAuth(
    base_url='https://auth.iglobals.com',  # Must NOT end with /
    client_id='ipod_itest_001',           # Must match DB
    client_secret='your-secret',          # Must be correct
    redirect_uri='http://localhost:5000/callback'  # Must match DB exactly
)
```

---

### 3. "Invalid Code Challenge"

**Error:**
```json
{
  "error": "invalid_request",
  "error_description": "PKCE challenge failed"
}
```

**Cause:** The `code_verifier` you sent in the token exchange doesn't match the `code_challenge` you sent in the authorize request.

**Solution:**
```python
# WRONG: Generating new PKCE on callback
@app.route('/callback')
def callback():
    pkce = client.generate_pkce()  # ❌ Don't generate new PKCE here!
    tokens = client.exchange_code(code, pkce['code_verifier'])

# CORRECT: Use the SAME verifier from login
@app.route('/callback')
def callback():
    verifier = session.get('pkce_verifier')  # ✅ Use stored verifier
    tokens = client.exchange_code(code, verifier)
```

---

### 4. "Invalid or Expired Code"

**Error:**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid or expired authorization code"
}
```

**Causes:**
- Authorization code has expired (10 minute lifetime)
- Code has already been used (one-time use only)
- Code is invalid

**Solutions:**
- Start the OAuth flow again from `/login`
- Don't refresh the callback page (codes can only be used once)
- Check system clocks are synchronized

---

### 5. "User Not Authenticated"

**Error on Consent Page:**
```json
{
  "error": "unauthorized",
  "error_description": "Not authenticated"
}
```

**Cause:** User's ICA session expired or doesn't exist when clicking "Allow" on consent page.

**Solution:**
- This happens if user waits too long on consent page
- User needs to start login flow again
- Check ICA session cookie settings (should be httpOnly, secure in production)

---

## Debugging OAuth Flow

### Enable Debug Logging

```python
import logging

logging.basicConfig(level=logging.DEBUG)

# SDK will now log all HTTP requests
client = IGlobalsAuth(...)
```

### Check Browser Network Tab

1. Open browser DevTools → Network tab
2. Start login flow
3. Watch for these requests:

**Step 1: Authorization Request**
```
GET https://auth.iglobals.com/api/oauth/authorize?
  client_id=ipod_itest_001
  &redirect_uri=http://localhost:5000/callback
  &response_type=code
  &scope=openid+profile+email
  &code_challenge=CHALLENGE_STRING
  &code_challenge_method=S256
  &state=STATE_STRING

→ Should return 302 redirect to /login (if not authenticated)
→ Then 302 redirect to /consent
→ Then 302 redirect back to your callback with ?code=...
```

**Step 2: Token Exchange**
```
POST https://auth.iglobals.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE_FROM_STEP_1",
  "client_id": "ipod_itest_001",
  "client_secret": "your-secret",
  "redirect_uri": "http://localhost:5000/callback",
  "code_verifier": "VERIFIER_STRING"
}

→ Should return 200 with tokens
```

**Step 3: User Info**
```
GET https://auth.iglobals.com/api/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN

→ Should return 200 with user profile
```

### Check ICA Session

Before clicking "Allow" on consent page, verify user is logged in:

```
GET https://auth.iglobals.com/api/auth/me
→ Should return user info if authenticated
→ If 401, user needs to login again
```

---

## Security Checklist

- ✅ **Always use HTTPS in production** (prevents token interception)
- ✅ **Store client_secret server-side only** (never in frontend JavaScript)
- ✅ **Implement PKCE** (SDK does this automatically)
- ✅ **Validate state parameter** (SDK doesn't do this - you must!)
- ✅ **Store tokens in server sessions** (not localStorage or cookies)
- ✅ **Use httpOnly cookies** for session management
- ✅ **Implement CSRF protection** (state parameter + secure sessions)
- ✅ **Handle token expiration** (use refresh tokens)
- ✅ **Revoke tokens on logout** (call `/api/oauth/revoke`)

---

## Quick Testing Guide

### Test with cURL

```bash
# 1. Get authorization code (do this in browser, will redirect through login)
open "https://auth.iglobals.com/api/oauth/authorize?client_id=ipod_itest_001&redirect_uri=http://localhost:5000/callback&response_type=code&scope=openid&code_challenge=CHALLENGE&code_challenge_method=S256&state=test123"

# 2. Exchange code for tokens (after getting code from redirect)
curl -X POST https://auth.iglobals.com/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "CODE_FROM_REDIRECT",
    "client_id": "ipod_itest_001",
    "client_secret": "your-secret",
    "redirect_uri": "http://localhost:5000/callback",
    "code_verifier": "VERIFIER"
  }'

# 3. Get user info
curl https://auth.iglobals.com/api/oauth/userinfo \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Test OAuth Client Registration

```sql
-- Verify your client exists
SELECT 
  client_id,
  name,
  redirect_uris,
  is_active,
  created_at
FROM ica.oauth_clients
WHERE client_id = 'ipod_itest_001';

-- Check if redirect_uri matches exactly
SELECT 
  client_id,
  redirect_uris,
  redirect_uris @> '["http://localhost:5000/callback"]' AS has_callback
FROM ica.oauth_clients
WHERE client_id = 'ipod_itest_001';
```

---

## Next Steps

1. **Fix consent page styling** - ✅ Already fixed in this session
2. **Verify OAuth client registration** - Check `redirect_uris` in database
3. **Test complete flow** - Use Python SDK example above
4. **Enable debug logging** - See exact API calls and responses
5. **Check browser console** - Look for JavaScript errors
6. **Review server logs** - Check ICA server logs for detailed error messages

For more details, see:
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- [sdk-py/README.md](./sdk-py/README.md)
- [sdk-js/README.md](./sdk-js/README.md)
