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
