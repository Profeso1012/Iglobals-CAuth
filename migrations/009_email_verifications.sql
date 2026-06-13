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
