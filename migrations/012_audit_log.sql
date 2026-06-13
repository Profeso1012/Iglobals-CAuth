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
