-- =============================================================================
-- Migration: 0002_create_users_and_refresh_tokens.sql
-- Branch:    feature/postgresql-user-auth
-- Purpose:   Creates the PostgreSQL users and refresh_tokens tables that will
--            permanently own application user identity and persistent token
--            records for the final authentication architecture.
--
--            PostgreSQL is the source of truth for users.
--            MongoDB will reference PostgreSQL user UUIDs as strings.
--
--            Registration of this migration into schema_migrations is handled
--            exclusively by the migration runner (migrate.js).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
-- gen_random_uuid() is a built-in function in PostgreSQL >= 13.
-- No extension is required.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    TEXT         NULL,     -- NULL for OAuth-only accounts
    oauth_provider   VARCHAR(50)  NULL,     -- e.g. 'google', 'firebase', 'auth0'
    oauth_provider_id TEXT        NULL,     -- provider's own user identifier
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Every email must be unique across the entire users table.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
    ON users (email);

-- A given (provider, provider_id) pair must be unique to prevent duplicate
-- OAuth identities.  We use a partial unique index so that:
--   • multiple rows with NULL oauth_provider are permitted (non-OAuth users)
--   • (provider, provider_id) is only enforced when both are non-NULL
CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_unique
    ON users (oauth_provider, oauth_provider_id)
    WHERE oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL;

-- Trigger function: keep updated_at current on every UPDATE.
-- A targeted function is preferred over a generic framework for maintainability.
CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- refresh_tokens
-- ---------------------------------------------------------------------------
-- Raw refresh token strings are NEVER stored here.
-- Only the SHA-256 hex hash of the token is persisted.
--
-- A token is valid when:
--   • revoked_at IS NULL
--   • expires_at > NOW()
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT        NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at   TIMESTAMPTZ NULL       -- NULL = active; populated = revoked
);

-- Primary lookup path: find a token record by its hash.
-- UNIQUE ensures no two sessions can share the same hashed token.
CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_unique
    ON refresh_tokens (token_hash);

-- Secondary lookup: all tokens for a given user (revocation, rotation, cleanup).
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx
    ON refresh_tokens (user_id);
