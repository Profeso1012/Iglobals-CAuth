CREATE TABLE ica.users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT      NOT NULL,
    email_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
    phone               TEXT,
    phone_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
    password_hash       TEXT,
    auth_provider       TEXT        NOT NULL DEFAULT 'local',
    auth_provider_id    TEXT,
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
