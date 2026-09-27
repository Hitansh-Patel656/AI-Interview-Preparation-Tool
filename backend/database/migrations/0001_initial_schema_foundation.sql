-- =============================================================================
-- Migration: 0001_initial_schema_foundation.sql
-- Branch:    feature/postgresql-setup
-- Purpose:   Establishes the PostgreSQL foundation for the AI Interview
--            Preparation Tool.
--
--            This migration does NOT create any application tables.
--            Application tables (users, outcomes, metric history, etc.)
--            will be added in future feature branches.
--
--            Registration of this migration into schema_migrations is
--            handled exclusively by the migration runner (migrate.js).
--
-- Run order: 001 — must be applied before any subsequent migration.
-- =============================================================================

-- schema_migrations is created by migrate.js before any SQL file runs.
-- This file intentionally contains no DDL beyond what is already handled
-- by the runner, serving as the verified anchor point for the migration
-- sequence and confirming the PostgreSQL connection is operational.

SELECT 1;   -- no-op: confirms the database connection is alive
