-- Add support for Google OAuth to existing users table

ALTER TABLE ica.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE ica.users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';
ALTER TABLE ica.users ADD COLUMN IF NOT EXISTS auth_provider_id TEXT;
