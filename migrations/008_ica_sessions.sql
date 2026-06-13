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
