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
