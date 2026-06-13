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
