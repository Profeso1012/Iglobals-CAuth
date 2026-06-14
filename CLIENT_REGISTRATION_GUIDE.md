# OAuth Client Registration Guide

## How to Register a Client App with ICA

When a third-party application wants to use iGlobals Central Auth (ICA) for authentication, they need to register their application as an OAuth client.

---

## What Information Clients Need to Provide

When registering, clients must provide:

1. **Client ID** - Unique identifier for the app (e.g., `my-awesome-app`)
2. **Client Secret** - Secure password for server-to-server communication
3. **App Name** - Human-readable display name (e.g., `"My Awesome App"`)
4. **Logo URL** - Public URL to their app logo (optional)
5. **Redirect URIs** - Allowed callback URLs after authentication

---

## Client Logo Requirements

### Logo Specifications:
- **Format:** PNG, JPG, or SVG
- **Size:** Recommended 512x512px (will be displayed at 56x56px)
- **Shape:** Square or circular (will be displayed in a circle)
- **Hosting:** Must be publicly accessible via HTTPS
- **File Size:** Under 200KB recommended

### Example Logo URLs:
```
https://cdn.myapp.com/logo.png
https://myapp.com/assets/logo-512.png
https://storage.googleapis.com/myapp-assets/logo.png
```

### ⚠️ **Important Notes:**
- ICA does **NOT** host client logos - clients must host their own
- The logo URL must be **publicly accessible** (no authentication required)
- Use HTTPS URLs only (HTTP will not work in production)
- The logo will be displayed on the consent screen when users authorize your app

---

## Method 1: Manual Registration (SQL)

For development or testing, you can manually insert a client into the database:

```sql
-- 1. Generate a bcrypt hash for your client secret
-- Use: https://bcrypt-generator.com/ or run: node -e "console.log(require('bcrypt').hashSync('your_secret', 12))"

-- 2. Insert the client
INSERT INTO ica.oauth_clients (
    client_id,
    client_secret_hash,
    name,
    logo_url,
    redirect_uris,
    is_active
) VALUES (
    'my-awesome-app',                          -- Your chosen client_id
    '$2b$12$EkN4KYoiwkWYEswM0uw0mOn...',     -- Bcrypt hash of your secret
    'My Awesome Application',                  -- Display name shown to users
    'https://myapp.com/logo.png',             -- Your logo URL (or NULL)
    '["https://myapp.com/auth/callback"]',    -- Array of allowed redirect URIs
    true                                       -- Client is active
);
```

### Example: Register iPod Test App

```sql
INSERT INTO ica.oauth_clients (
    client_id,
    client_secret_hash,
    name,
    logo_url,
    redirect_uris
) VALUES (
    'ipod_itest_001',
    '$2b$12$LQv3c1yqBwlgNWBp7bKEauT.wFdkjK0RZKzQqLMU8aGMPKJAJqJne',  -- Hash of: test_secret_12345
    'iPod Test Application',
    'https://cdn.example.com/ipod-logo.png',  -- Replace with actual logo URL
    '["http://localhost:5000/callback"]'
);
```

---

## Method 2: Admin API Registration (Coming Soon)

In the future, clients will register through an admin portal:

```bash
POST /api/admin/clients
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "client_id": "my-awesome-app",
  "client_secret": "your_plain_text_secret",
  "name": "My Awesome Application",
  "logo_url": "https://myapp.com/logo.png",
  "redirect_uris": [
    "https://myapp.com/auth/callback",
    "https://myapp.com/auth/callback-mobile"
  ]
}
```

---

## How Logo & Name Appear on Consent Screen

When a user authorizes your app, they'll see a consent screen like this:

```
┌─────────────────────────────────────────┐
│  🌐 Sign in with iGlobals               │
├─────────────────────────────────────────┤
│                                         │
│  [LOGO]                 │  My Awesome  │
│  My Awesome App         │  Application  │
│  user@iglobals.com      │  wants to    │
│                         │  access your  │
│                         │  I-con Account│
│                         │               │
│                         │  ✓ Identity   │
│                         │  ✓ Profile    │
│                         │  ✓ Email      │
│                         │               │
│                         │  [Cancel] [Allow]
└─────────────────────────────────────────┘
```

- **Left side:** Shows your logo (or first letter of name), app name, and logged-in user
- **Right side:** Shows permissions your app is requesting

---

## Testing Your Logo

After registering, test that your logo displays correctly:

1. Start OAuth flow from your client app
2. User should see ICA login page
3. After login, consent page should show:
   - Your app logo (if provided)
   - Your app name
   - Requested permissions

### If Logo Doesn't Show:
- ✅ Check logo URL is publicly accessible (open in browser)
- ✅ Ensure URL uses HTTPS (not HTTP)
- ✅ Verify logo_url in database is correct: `SELECT logo_url FROM ica.oauth_clients WHERE client_id = 'your-app';`
- ✅ Check browser console for CORS or loading errors
- ✅ Try a different image host if current one blocks external access

---

## Update Client Information

To update your logo or name after registration:

```sql
-- Update logo
UPDATE ica.oauth_clients
SET logo_url = 'https://myapp.com/new-logo.png'
WHERE client_id = 'my-awesome-app';

-- Update name
UPDATE ica.oauth_clients
SET name = 'My New App Name'
WHERE client_id = 'my-awesome-app';

-- Update both
UPDATE ica.oauth_clients
SET name = 'My New App Name',
    logo_url = 'https://myapp.com/new-logo.png'
WHERE client_id = 'my-awesome-app';
```

Changes take effect immediately - no restart required!

---

## Security Best Practices

### Client Secret:
- **Never** commit client secrets to git
- Store secrets in environment variables
- Rotate secrets periodically
- Use different secrets for development and production

### Logo URL:
- Use a CDN for better performance
- Don't use localhost URLs (won't work for other users)
- Ensure the hosting service has good uptime
- Consider using versioned URLs (e.g., `/logo-v2.png`) for easier updates

### Redirect URIs:
- Use HTTPS in production (HTTP only for localhost)
- Be specific - avoid wildcards
- Register separate URIs for web, mobile, and development

---

## Common Issues

### Issue: Logo doesn't display
**Solution:** 
- Open logo URL directly in browser - does it load?
- Check browser console for CORS errors
- Try different image host (imgur, cloudinary, etc.)

### Issue: "Client not found" on consent page
**Solution:** 
- Verify client_id is correct in your app
- Check database: `SELECT * FROM ica.oauth_clients WHERE client_id = 'your-id';`

### Issue: "Invalid client credentials" during token exchange
**Solution:** 
- You're using the bcrypt hash instead of plain-text secret
- Use the original plain-text secret you used before hashing
- See: [VERCEL_DEPLOYMENT_FIX.md](./VERCEL_DEPLOYMENT_FIX.md) for details

---

## Example: Complete Registration Flow

### 1. Prepare your logo
- Create 512x512px PNG
- Upload to `https://mycdn.com/my-app-logo.png`
- Test URL in browser

### 2. Generate client secret
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a1b2c3d4e5f6...

# Hash it for database
node -e "console.log(require('bcrypt').hashSync('a1b2c3d4e5f6...', 12))"
# Output: $2b$12$...
```

### 3. Register in database
```sql
INSERT INTO ica.oauth_clients (client_id, client_secret_hash, name, logo_url, redirect_uris)
VALUES (
    'my-app',
    '$2b$12$...',  -- The hash from step 2
    'My Application',
    'https://mycdn.com/my-app-logo.png',
    '["https://myapp.com/callback"]'
);
```

### 4. Configure your app
```python
# In your app's .env
ICA_BASE_URL=https://iglobals-c-auth-web.vercel.app
ICA_CLIENT_ID=my-app
ICA_CLIENT_SECRET=a1b2c3d4e5f6...  # Plain-text secret, NOT the hash!
ICA_REDIRECT_URI=https://myapp.com/callback
```

### 5. Test the flow
- Click login in your app
- Should redirect to ICA with your logo showing
- Grant permission
- Should redirect back to your app with auth code

---

## Need Help?

- Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for SDK setup
- See [OAUTH_FLOW_EXPLAINED.md](./OAUTH_FLOW_EXPLAINED.md) for flow details
- Review [sdk-py/README.md](./sdk-py/README.md) for Python examples
