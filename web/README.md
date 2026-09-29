# ICA (web)

The Next.js app itself - this folder is the whole ICA service (frontend + `/api/*` backend). See the root [`README.md`](../README.md) for the full feature list and architecture, and [`CLIENT_REGISTRATION_GUIDE.md`](../CLIENT_REGISTRATION_GUIDE.md) for admin/client-management usage once it's running.

## Running locally

1. **Postgres**: create a local database, then point `DATABASE_URL` at it (see `.env.example`).
2. **Copy env file**: `cp .env.example .env.local`, then fill in at minimum `DATABASE_URL`, `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`/`JWT_KID` (generate with `node scripts/generate-keys.js` from the repo root), `SESSION_SECRET`, `ADMIN_JWT_SECRET`, and `ADMIN_SECRET`. Email/SMS/Google OAuth/Paystack vars are optional for local auth-flow testing - only needed if you're testing those specific features.
3. **Run migrations**: `node ../scripts/migrate.js` (from this folder, or `node scripts/migrate.js` from the repo root).
4. **Give yourself admin access**: `node ../scripts/add-admin-email.js you@example.com` (needs `DATABASE_URL` set).
5. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000). The admin panel is at `/admin/login`.

## Registering a local client app (e.g. iTest or iGlobal_edu running on your machine)

Once ICA is running, log into `/admin/login` and create a client via `/admin/clients` - see [`CLIENT_REGISTRATION_GUIDE.md`](../CLIENT_REGISTRATION_GUIDE.md) for the full walkthrough (registering, editing, rotating secrets, setting up payment webhooks). Point the other app's `.env` at this ICA instance (`ICA_BASE_URL=http://localhost:3000`) with the `client_id`/`client_secret` you just created.

Note: iTest and iGlobal_edu both default to port 5000 locally - if you need both running against this ICA instance at the same time, change one app's port and its registered `redirect_uri` to match.
