-- Admin login: email allowlist + one-time-passcode requests.
-- Admin emails can only be added directly via SQL (see scripts / docs) —
-- there is no self-service admin signup.

CREATE TABLE ica.admin_emails (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       CITEXT      NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ica_admin_emails_email_unique ON ica.admin_emails (email);

CREATE TABLE ica.admin_otp_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       CITEXT      NOT NULL,
    otp_hash    TEXT        NOT NULL,
    attempts    INT         NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ica_admin_otp_email_idx      ON ica.admin_otp_requests (email);
CREATE INDEX ica_admin_otp_created_at_idx ON ica.admin_otp_requests (created_at DESC);
