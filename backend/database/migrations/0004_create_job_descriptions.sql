-- =============================================================================
-- Migration: 0004_create_job_descriptions.sql
-- Branch:    feature/postgresql-job-description
-- Purpose:   Creates the PostgreSQL table for job descriptions.
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_descriptions (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_text         TEXT         NOT NULL,
    parsed_keywords  JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT raw_text_length CHECK (length(trim(raw_text)) >= 20)
);

CREATE INDEX idx_job_descriptions_user_id ON job_descriptions(user_id);

-- Trigger function: keep updated_at current
CREATE OR REPLACE TRIGGER job_descriptions_set_updated_at
    BEFORE UPDATE ON job_descriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
