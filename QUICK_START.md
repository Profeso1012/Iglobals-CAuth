# Quick Start Guide

Get your iGlobals Central Auth server running in minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon recommended)
- npm or yarn

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (web, sdk-js, sdk-py).

### 2. Generate JWT Keys

```bash
npm run generate-keys
```

This creates RSA key pairs for JWT signing and updates your `.env` file.

### 3. Configure Environment

**Option A: Use existing root `.env`**
```bash
# Edit .env and add your DATABASE_URL
# The keys are already generated from step 2
```

**Option B: Copy to web directory**
```bash
cp .env web/.env.local
```

**Required variables:**
```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_PRIVATE_KEY="..."  # Generated in step 2
JWT_PUBLIC_KEY="..."   # Generated in step 2
JWT_KID=key-1
SESSION_SECRET=random-secret-at-least-32-chars
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ICA_BASE_URL=http://localhost:3000
ADMIN_JWT_SECRET=admin-secret
```

### 4. Run Database Migrations

```bash
npm run migrate
```

Or manually:
```bash
psql $DATABASE_URL -f migrations/001_extensions.sql
psql $DATABASE_URL -f migrations/002_schema.sql
psql $DATABASE_URL -f migrations/003_users.sql
# ... continue for all migration files
```

### 5. Start Development Server

```bash
npm run dev
```

Or:
```bash
cd web
npm run dev
```

Your auth server is now running at **http://localhost:3000**!

## Verify Installation

### Check Frontend
Open http://localhost:3000 in your browser. You should see the auth UI.

### Check API
```bash
curl http://localhost:3000/api/oauth/.well-known/openid-configuration
```

Should return OIDC configuration JSON.

### Test Registration
1. Go to http://localhost:3000
2. Click "Become an I-con" (register)
3. Fill out the form
4. Check that you can log in

## Create OAuth Client

To integrate apps, you need to create OAuth clients. Two options:

### Option 1: Manual (Development)
```sql
-- Connect to your database
psql $DATABASE_URL

-- Hash a client secret (using Node.js)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('my-secret', 10).then(console.log)"

-- Insert client
INSERT INTO ica.oauth_clients (
  client_id, 
  client_secret_hash, 
  name, 
  redirect_uris, 
  allowed_scopes
) VALUES (
  'my-app',
  '$2b$10$...', -- paste hashed secret from above
  'My Application',
  ARRAY['http://localhost:3000/callback'],
  ARRAY['openid', 'profile', 'email']
);
```

### Option 2: Admin Portal (Coming Soon)
Access http://localhost:3000/admin to manage clients via UI.

## Test with SDK

### JavaScript
```bash
mkdir test-app && cd test-app
npm init -y
npm install @iglobals/auth-client
```

```javascript
// test.js
const { ICAClient } = require('@iglobals/auth-client');

const client = new ICAClient({
  baseUrl: 'http://localhost:3000',
  clientId: 'my-app',
  clientSecret: 'my-secret',
  redirectUri: 'http://localhost:3000/callback'
});

const { codeChallenge } = client.generatePKCE();
const authUrl = client.getAuthorizationUrl('state123', codeChallenge);
console.log('Visit:', authUrl);
```

### Python
```bash
pip install iglobals-auth
```

```python
# test.py
from iglobals_auth import IGlobalsAuth

client = IGlobalsAuth(
    base_url='http://localhost:3000',
    client_id='my-app',
    client_secret='my-secret',
    redirect_uri='http://localhost:3000/callback'
)

pkce = client.generate_pkce()
auth_url = client.get_authorization_url('state123', pkce['code_challenge'])
print('Visit:', auth_url)
```

## Production Deployment

### Deploy to Vercel

```bash
cd web
vercel
```

Follow prompts, then add environment variables in Vercel dashboard:
- DATABASE_URL
- JWT_PRIVATE_KEY
- JWT_PUBLIC_KEY
- JWT_KID
- SESSION_SECRET
- NEXT_PUBLIC_BASE_URL
- ICA_BASE_URL
- (Plus optional: SMTP, SMS, Admin vars)

### Deploy to Other Platforms

The `web/` directory is a standard Next.js app. Deploy to:
- **Netlify**: Connect GitHub repo, set base directory to `web/`
- **Railway**: Connect repo, set root directory to `web/`
- **AWS Amplify**: Point to `web/` directory
- **Docker**: Use `docker-compose.yml` at root

## Cleanup Old Files

After confirming everything works:

```bash
# Remove old Express API
rm -rf api/

# Remove root node_modules (optional)
rm -rf node_modules/

# Remove demo files
rm -f google_chrome_auth\ \(1\).html
```

See [CLEANUP_GUIDE.md](./CLEANUP_GUIDE.md) for details.

## Common Issues

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # Mac/Linux
# Or use a different port
cd web && PORT=3001 npm run dev
```

### Database connection error
- Check DATABASE_URL is correct
- Ensure database is accessible (firewall, SSL)
- Verify migrations ran successfully

### JWT errors
- Ensure JWT keys are properly formatted in .env
- Keys should include `\n` for newlines
- Run `npm run generate-keys` to regenerate

### Module not found errors
```bash
# Reinstall dependencies
rm -rf node_modules web/node_modules
npm install
```

## Next Steps

- **Integration**: See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **SDK Docs**: See [sdk-js/README.md](./sdk-js/README.md) and [sdk-py/README.md](./sdk-py/README.md)
- **Architecture**: See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
- **Migration Details**: See [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/iglobals-cauth/issues)
- **Docs**: Check the markdown files in this repo
- **Examples**: See SDK README files for complete examples

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm start                      # Start production server

# Utilities
npm run generate-keys          # Generate JWT keys
npm run migrate                # Run database migrations

# SDKs
npm run build:sdks             # Build both SDKs
npm run build:sdk-js           # Build JavaScript SDK
npm run build:sdk-py           # Build Python SDK

# Cleanup
rm -rf api/                    # Remove old API folder
rm -rf node_modules/           # Remove root node_modules
```
