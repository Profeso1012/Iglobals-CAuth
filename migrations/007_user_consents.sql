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
