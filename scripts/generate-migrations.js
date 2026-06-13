const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../migrations');

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const migrations = {
  '001_extensions.sql': `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
  `,
  '002_schema.sql': `
CREATE SCHEMA IF NOT EXISTS ica;
  `,
  '003_users.sql': `
CREATE TABLE ica.users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT      NOT NULL,
    email_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
    phone               TEXT,
    phone_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
    password_hash       TEXT        NOT NULL,
    first_name          TEXT        NOT NULL,
    last_name           TEXT        NOT NULL,
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,
    state               TEXT,
    country             TEXT,
    postal_code         TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ica_users_email_unique ON ica.users (email);
CREATE INDEX ica_users_phone_idx          ON ica.users (phone) WHERE phone IS NOT NULL;
CREATE INDEX ica_users_created_at_idx     ON ica.users (created_at);
  `,
  '004_oauth_clients.sql': `
CREATE TABLE ica.oauth_clients (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           TEXT        NOT NULL,
    client_secret_hash  TEXT        NOT NULL,
    name                TEXT        NOT NULL,
    description         TEXT,
    logo_url            TEXT,
    redirect_uris       TEXT[]      NOT NULL,
    allowed_scopes      TEXT[]      NOT NULL DEFAULT ARRAY['openid','profile','email'],
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ica_oauth_clients_client_id_unique ON ica.oauth_clients (client_id);
  `,
  '005_authorization_codes.sql': `
CREATE TABLE ica.authorization_codes (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    TEXT        NOT NULL,
    client_id               TEXT        NOT NULL REFERENCES ica.oauth_clients(client_id) ON DELETE CASCADE,
    user_id                 UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    scopes                  TEXT[]      NOT NULL,
    redirect_uri            TEXT        NOT NULL,
    code_challenge          TEXT        NOT NULL,
    code_challenge_method   TEXT        NOT NULL DEFAULT 'S256',
    expires_at              TIMESTAMPTZ NOT NULL,
    used_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ica_auth_codes_code_unique ON ica.authorization_codes (code);
CREATE INDEX ica_auth_codes_expires_at_idx     ON ica.authorization_codes (expires_at);
CREATE INDEX ica_auth_codes_user_client_idx    ON ica.authorization_codes (user_id, client_id);
  `,
  '006_refresh_tokens.sql': `
CREATE TABLE ica.refresh_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash      TEXT        NOT NULL,
    client_id       TEXT        NOT NULL REFERENCES ica.oauth_clients(client_id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    scopes          TEXT[]      NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX ica_refresh_tokens_hash_unique    ON ica.refresh_tokens (token_hash);
CREATE INDEX ica_refresh_tokens_user_client_idx       ON ica.refresh_tokens (user_id, client_id);
CREATE INDEX ica_refresh_tokens_expires_at_idx        ON ica.refresh_tokens (expires_at);
  `,
  '007_user_consents.sql': `
CREATE TABLE ica.user_consents (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    client_id   TEXT        NOT NULL REFERENCES ica.oauth_clients(client_id) ON DELETE CASCADE,
    scopes      TEXT[]      NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX ica_consents_user_client_unique ON ica.user_consents (user_id, client_id) WHERE revoked_at IS NULL;
CREATE INDEX ica_consents_user_idx ON ica.user_consents (user_id);
  `,
  '008_ica_sessions.sql': `
CREATE TABLE ica.ica_sessions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash  TEXT        NOT NULL,
    user_id             UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    user_agent          TEXT,
    ip_address          INET,
    remember_me         BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at          TIMESTAMPTZ NOT NULL,
    last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ica_sessions_token_hash_unique ON ica.ica_sessions (session_token_hash);
CREATE INDEX ica_sessions_user_idx                 ON ica.ica_sessions (user_id);
CREATE INDEX ica_sessions_expires_at_idx           ON ica.ica_sessions (expires_at);
  `,
  '009_email_verifications.sql': `
CREATE TABLE ica.email_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    email       CITEXT      NOT NULL,
    otp_hash    TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    attempts    INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ica_email_verif_user_idx     ON ica.email_verifications (user_id);
CREATE INDEX ica_email_verif_expires_idx  ON ica.email_verifications (expires_at);
  `,
  '010_phone_verifications.sql': `
CREATE TABLE ica.phone_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    phone       TEXT        NOT NULL,
    otp_hash    TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    attempts    INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ica_phone_verif_user_idx    ON ica.phone_verifications (user_id);
CREATE INDEX ica_phone_verif_expires_idx ON ica.phone_verifications (expires_at);
  `,
  '011_password_reset_requests.sql': `
CREATE TABLE ica.password_reset_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES ica.users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ica_pwd_reset_token_unique ON ica.password_reset_requests (token_hash);
CREATE INDEX ica_pwd_reset_user_idx            ON ica.password_reset_requests (user_id);
CREATE INDEX ica_pwd_reset_expires_idx         ON ica.password_reset_requests (expires_at);
  `,
  '012_audit_log.sql': `
CREATE TABLE ica.audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  TEXT        NOT NULL,
    user_id     UUID        REFERENCES ica.users(id) ON DELETE SET NULL,
    client_id   TEXT        REFERENCES ica.oauth_clients(client_id) ON DELETE SET NULL,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ica_audit_user_idx       ON ica.audit_log (user_id);
CREATE INDEX ica_audit_event_type_idx ON ica.audit_log (event_type);
CREATE INDEX ica_audit_created_at_idx ON ica.audit_log (created_at DESC);
  `,
  '013_seed_admin_client.sql': `
-- We will seed a client for the admin panel here or test app
  `
};

for (const [filename, content] of Object.entries(migrations)) {
  fs.writeFileSync(path.join(migrationsDir, filename), content.trim() + '\n');
}
console.log('Created migrations.');
