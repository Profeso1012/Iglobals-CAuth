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
