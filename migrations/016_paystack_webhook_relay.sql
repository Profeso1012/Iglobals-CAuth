-- Centralized payment-webhook relay: ICA receives Paystack webhooks once
-- (one shared account across every client app) and forwards each event to
-- whichever client app it belongs to, re-signed with a secret unique to
-- that client<->ICA relationship (never Paystack's own signature - that
-- would require every client app to share Paystack's raw secret key).
--
-- Separate table (not columns on oauth_clients) since a client may have
-- zero, one, or eventually more than one provider relay configured, and new
-- providers (Flutterwave, etc.) should not require repeated ALTER TABLEs.
CREATE TABLE ica.client_webhook_configs (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               TEXT        NOT NULL REFERENCES ica.oauth_clients(client_id) ON DELETE CASCADE,
    provider                TEXT        NOT NULL,          -- 'paystack' today; 'flutterwave' etc. later
    webhook_url             TEXT        NOT NULL,          -- the client app's own endpoint ICA relays to
    -- AES-256-GCM ciphertext (iv:authTag:ciphertext, hex) - see lib/crypto.ts
    -- encryptSecret/decryptSecret. Must be reversible (unlike client_secret_hash's
    -- bcrypt), since ICA needs the plaintext at relay-time to compute the
    -- outbound HMAC signature for this client.
    relay_secret_encrypted  TEXT        NOT NULL,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, provider)
);

CREATE INDEX client_webhook_configs_provider_idx ON ica.client_webhook_configs (provider);
