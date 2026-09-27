-- =============================================================================
-- Migration: 0003_create_user_resumes.sql
-- Branch:    feature/postgresql-resume
-- Purpose:   Creates the PostgreSQL table for user resumes.
--            Establishes a 1-to-1 relationship with the users table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_resumes (
    user_id          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    file_name        VARCHAR(255) NOT NULL,
    file_path        TEXT         NOT NULL,
    parsed_data      JSONB        NULL,
    uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger function: keep updated_at current
CREATE OR REPLACE TRIGGER user_resumes_set_updated_at
    BEFORE UPDATE ON user_resumes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
