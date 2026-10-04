-- =============================================================================
-- Migration: 0005_create_outcomes.sql
-- Branch:    feature/postgresql-outcomes-progress
-- Purpose:   Creates the PostgreSQL table for durable interview outcomes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(24) NOT NULL UNIQUE,
    role TEXT NOT NULL,
    interview_type TEXT NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    content_relevance_score INTEGER CHECK (content_relevance_score >= 0 AND content_relevance_score <= 100),
    star_compliance_score INTEGER CHECK (star_compliance_score >= 0 AND star_compliance_score <= 100),
    body_language_score INTEGER CHECK (body_language_score >= 0 AND body_language_score <= 100),
    company_name TEXT,
    round TEXT,
    real_world_outcome TEXT CHECK (real_world_outcome IN ('offer', 'rejected', 'in-progress', 'no-response')),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    completed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outcomes_user_id ON outcomes(user_id);
CREATE INDEX idx_outcomes_created_at ON outcomes(created_at DESC);
