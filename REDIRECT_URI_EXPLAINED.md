# OAuth Redirect URI - Database vs SDK

## Quick Answer

- **Database `redirect_uris`**: **Whitelist** of allowed URIs (security boundary)
- **SDK `redirect_uri`**: **Active** URI for this OAuth flow (must be in whitelist)

## The Two Levels

### Level 1: Registration (Database)
```sql
INSERT INTO ica.oauth_clients (client_id, redirect_uris)
VALUES (
  'my-app',
  '{"http://localhost:3000/callback", "https://myapp.com/callback"}'
);
```

This defines **what** redirect URIs are permitted. It's a JSON array that can contain multiple URIs for different environments.

### Level 2: Runtime (SDK)
```python
client = IGlobalsAuth(
    client_id='my-app',
    redirect_uri='http://localhost:3000/callback'  # Must be in DB list
)
```

This is **which** redirect URI to use for this specific OAuth flow. It must exactly match one of the URIs in the database whitelist.

## Why Two Levels?

### Security: Preventing Redirect Attacks

Without this two-level system, an attacker could do:

```python
# Attacker's malicious attempt
client = IGlobalsAuth(
    client_id='my-app',
    redirect_uri='https://evil.com/steal-tokens'  # ❌ Rejected!
)
```

The OAuth server checks if `https://evil.com/steal-tokens` is in the database whitelist. Since it's not, the authorization request is **rejected** before any credentials are exchanged.

## Real-World Example

### Registration Time (Admin Portal)
You register your app and specify all possible redirect URIs:

```json
{
  "client_id": "my-awesome-app",
  "redirect_uris": [
    "http://localhost:3000/auth/callback",      // Local dev
    "http://localhost:3001/auth/callback",      // Local dev (different port)
    "https://staging.myapp.com/auth/callback",  // Staging
    "https://myapp.com/auth/callback"           // Production
  ]
}
```

### Runtime (Your Application)

**Development instance:**
```python
dev_client = IGlobalsAuth(
    client_id='my-awesome-app',
    redirect_uri='http://localhost:3000/auth/callback'  # ✅ In whitelist
)
```

**Production instance:**
```python
prod_client = IGlobalsAuth(
    client_id='my-awesome-app',
    redirect_uri='https://myapp.com/auth/callback'  # ✅ In whitelist
)
```

**Attacker's attempt:**
```python
evil_client = IGlobalsAuth(
    client_id='my-awesome-app',
    redirect_uri='https://attacker.com/steal'  # ❌ NOT in whitelist
)
```

## What Happens During OAuth Flow

1. **User clicks "Login with iGlobals"**
2. **Your app redirects** to:
   ```
   https://auth.iglobals.com/oauth/authorize?
     client_id=my-awesome-app&
     redirect_uri=https://myapp.com/auth/callback&  ← This must be in DB
     response_type=code&
     state=xyz123
   ```

3. **OAuth server validates**:
   - Does `my-awesome-app` exist? ✅
   - Is `https://myapp.com/auth/callback` in the whitelist? ✅
   - If NO → Reject with `redirect_uri_mismatch` error

4. **User logs in and consents**

5. **OAuth server redirects back** to the validated URI:
   ```
   https://myapp.com/auth/callback?code=abc123&state=xyz123
   ```

6. **Your app exchanges code for tokens**

## Common Mistakes

### ❌ Typo in SDK redirect_uri
```python
# Database has: http://localhost:3000/callback
client = IGlobalsAuth(
    redirect_uri='http://localhost:3000/auth/callback'  # Extra /auth
)
# Result: redirect_uri_mismatch error
```

### ❌ Using different port
```python
# Database has: http://localhost:3000/callback
client = IGlobalsAuth(
    redirect_uri='http://localhost:3001/callback'  # Different port
)
# Result: redirect_uri_mismatch error
```

### ❌ Protocol mismatch
```python
# Database has: http://localhost:3000/callback
client = IGlobalsAuth(
    redirect_uri='https://localhost:3000/callback'  # https instead of http
)
# Result: redirect_uri_mismatch error
```

## Best Practices

1. **Register all environments** in the database whitelist during app setup
2. **Use environment variables** to set the correct redirect_uri at runtime:
   ```python
   import os
   
   client = IGlobalsAuth(
       client_id='my-app',
       redirect_uri=os.getenv('OAUTH_REDIRECT_URI')  # Different per environment
   )
   ```

3. **Keep whitelist minimal** - only add URIs you actually use
4. **Use HTTPS in production** - never use `http://` for production redirect URIs
5. **Match exactly** - OAuth redirect URI matching is **exact**, including:
   - Protocol (http vs https)
   - Domain/subdomain
   - Port
   - Path
   - No query parameters or fragments allowed in whitelist

## Summary Table

| Aspect | Database `redirect_uris` | SDK `redirect_uri` |
|--------|-------------------------|-------------------|
| **Purpose** | Security whitelist | Active flow endpoint |
| **Type** | JSON array | Single string |
| **When set** | Client registration | App initialization |
| **Can have multiple?** | Yes | No (one per flow) |
| **Who controls?** | Admin/Developer | Application code |
| **Validation** | Defines allowed values | Must match database |
| **Change frequency** | Rarely (setup) | Per environment |

## Related Files

- Database: `migrations/004_oauth_clients.sql`
- SDK validation: Check your OAuth server's authorize endpoint
- Client registration: Admin portal or `scripts/register-client.js`
