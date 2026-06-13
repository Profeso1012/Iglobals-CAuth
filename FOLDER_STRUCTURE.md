# Folder Structure

This document explains the clean, production-ready folder structure after consolidating to a single Next.js deployment.

## Root Directory Structure

```
iglobals-cauth/
├── .git/                    # Git repository
├── .github/                 # GitHub Actions workflows
│   └── workflows/
│       ├── publish-js-sdk.yml
│       ├── publish-python-sdk.yml
│       └── publish-sdks.yml
├── migrations/              # Database migration SQL files
│   ├── 001_extensions.sql
│   ├── 002_schema.sql
│   ├── 003_users.sql
│   └── ...
├── scripts/                 # Utility scripts
│   ├── generate-keys.js     # Generate JWT keys
│   └── run-migrations.js    # Run database migrations
├── sdk-js/                  # JavaScript/TypeScript SDK
│   ├── src/                 # TypeScript source
│   ├── dist/                # Compiled JavaScript (published to npm)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── sdk-py/                  # Python SDK
│   ├── iglobals_auth/       # Python source package
│   ├── pyproject.toml
│   └── README.md
├── web/                     # 🚀 Main Next.js Application
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── api/         # API Routes (Backend)
│   │   │   │   ├── oauth/   # OAuth 2.0 endpoints
│   │   │   │   │   ├── token/route.ts
│   │   │   │   │   ├── authorize/route.ts
│   │   │   │   │   ├── userinfo/route.ts
│   │   │   │   │   ├── jwks/route.ts
│   │   │   │   │   ├── revoke/route.ts
│   │   │   │   │   └── .well-known/openid-configuration/route.ts
│   │   │   │   ├── auth/    # User auth endpoints
│   │   │   │   │   ├── login/route.ts
│   │   │   │   │   ├── register/route.ts
│   │   │   │   │   ├── me/route.ts
│   │   │   │   │   └── ...
│   │   │   │   └── admin/   # Admin endpoints
│   │   │   ├── (auth)/      # Auth pages (login, register)
│   │   │   ├── (dashboard)/ # Dashboard pages
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/      # React components
│   │   └── lib/             # Shared utilities
│   │       ├── db/          # Database layer
│   │       │   ├── pool.ts
│   │       │   └── queries/
│   │       │       ├── users.ts
│   │       │       ├── oauth_clients.ts
│   │       │       ├── authorization_codes.ts
│   │       │       ├── refresh_tokens.ts
│   │       │       └── ...
│   │       ├── config.ts          # Environment config
│   │       ├── crypto.ts          # Crypto utilities
│   │       ├── jwt.ts             # JWT handling
│   │       ├── jwks.ts            # JWKS support
│   │       ├── session.ts         # Session management
│   │       ├── validation.ts      # Joi schemas
│   │       ├── mailer.ts          # Email sending
│   │       ├── sms.ts             # SMS sending
│   │       └── api-helpers.ts     # API utilities
│   ├── public/              # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── .env.local           # Environment variables (gitignored)
├── .env                     # Root env (for scripts/migrations)
├── .gitignore
├── package.json             # Root workspace config
├── package-lock.json
├── docker-compose.yml       # Docker setup (optional)
├── README.md                # Main documentation
├── INTEGRATION_GUIDE.md     # Integration instructions
├── MIGRATION_SUMMARY.md     # Migration details
└── FOLDER_STRUCTURE.md      # This file
```

## Key Directories

### `/web` - Main Application
The **only** directory you need to deploy. Contains:
- Frontend React pages
- Backend API routes
- Database logic
- All utilities and middleware

**To run:**
```bash
cd web
npm install
npm run dev
```

**To deploy to Vercel:**
```bash
cd web
vercel deploy --prod
```

### `/migrations` - Database Schemas
SQL migration files to set up your PostgreSQL database.

**To run migrations:**
```bash
npm run migrate
# or manually:
psql $DATABASE_URL -f migrations/001_extensions.sql
psql $DATABASE_URL -f migrations/002_schema.sql
# ... continue for all files
```

### `/scripts` - Utility Scripts
Helper scripts for development:
- `generate-keys.js` - Generate RSA key pair for JWT signing
- `run-migrations.js` - Run all database migrations

**Usage:**
```bash
npm run generate-keys
npm run migrate
```

### `/sdk-js` - JavaScript SDK
Published to npm as `@iglobals/auth-client`.

**To build:**
```bash
npm run build:sdk-js
```

**To publish:**
```bash
cd sdk-js
npm publish
```

### `/sdk-py` - Python SDK
Published to PyPI as `iglobals-auth`.

**To build:**
```bash
npm run build:sdk-py
# or
cd sdk-py
python -m build
```

**To publish:**
```bash
cd sdk-py
python -m twine upload dist/*
```

## Files Removed (Old Architecture)

The following are **no longer needed** after consolidation:

- ❌ `/api/` folder (Express backend - now integrated into `/web/src/app/api`)
- ❌ `/node_modules` at root (use `/web/node_modules` instead)

## Environment Variables

### Root `.env`
Used by scripts and migrations only:
```bash
DATABASE_URL=postgresql://...
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
# ... other vars
```

### Web `.env.local`
Used by the Next.js application (create from template below):
```bash
# Copy root .env to web/.env.local
cp .env web/.env.local
```

Or create `web/.env.local` with:
```bash
DATABASE_URL=postgresql://...
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
JWT_KID=key-1
SESSION_SECRET=random-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ICA_BASE_URL=http://localhost:3000
# ... add SMTP, SMS, admin credentials
```

## Deployment Files by Platform

### Vercel
Only needs:
- `/web` directory
- Environment variables in Vercel dashboard
- No `vercel.json` needed (uses Next.js defaults)

### Docker
- `docker-compose.yml` at root
- Define services for web and database

### GitHub Actions
- `.github/workflows/` for SDK publishing
- Add deployment workflows as needed

## What to Commit

**Commit:**
- ✅ `/web/src/` - Application code
- ✅ `/migrations/` - Database schemas
- ✅ `/scripts/` - Utility scripts
- ✅ `/sdk-js/src/` - SDK source code
- ✅ `/sdk-py/iglobals_auth/` - SDK source code
- ✅ `.gitignore`, `README.md`, docs
- ✅ `package.json`, `tsconfig.json`, configs

**Don't Commit (in .gitignore):**
- ❌ `.env`, `.env.local` - Secrets
- ❌ `node_modules/` - Dependencies
- ❌ `/web/.next/` - Build output
- ❌ `/sdk-js/dist/` - Compiled SDK
- ❌ `/sdk-py/dist/` - Built packages
- ❌ `*.log` - Log files

## Quick Commands

```bash
# Development
cd web && npm run dev              # Start Next.js dev server
npm run dev                        # Same (from root)

# Build
cd web && npm run build            # Build Next.js for production
npm run build                      # Same (from root)

# Production
cd web && npm start                # Start production server
npm start                          # Same (from root)

# Utilities
npm run generate-keys              # Generate JWT keys
npm run migrate                    # Run database migrations

# SDKs
npm run build:sdks                 # Build both SDKs
npm run build:sdk-js               # Build JS SDK only
npm run build:sdk-py               # Build Python SDK only
```

## Workspace Configuration

The root `package.json` uses npm workspaces:

```json
{
  "workspaces": ["web", "sdk-js", "sdk-py"]
}
```

This allows:
- Shared `node_modules` at root
- Run commands in specific workspaces
- Centralized dependency management

## Next Steps

1. **Remove old `api/` folder** (after verifying migration)
2. **Copy `.env` to `web/.env.local`**
3. **Test the application**: `cd web && npm run dev`
4. **Deploy to Vercel** from `web/` directory
5. **Update CI/CD** to build from `web/` only
