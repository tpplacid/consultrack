-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008 — Move education fields from hardcoded columns → custom_data
-- ─────────────────────────────────────────────────────────────────────────────
-- Context: Consultrackk is multi-tenant. Education-specific columns
-- (lead_type, location, twelfth_score, etc.) are Admishine-specific and
-- don't belong on a shared leads table. All org-specific field data now
-- lives in custom_data (jsonb).
--
-- This migration:
--   1. Ensures custom_data column exists (may already be present).
--   2. Copies existing column values into custom_data for every lead that
--      has at least one non-null education field.
--
-- Safety guarantees:
--   • Uses (column_object) || custom_data so existing custom_data keys
--     WIN — idempotent if run more than once.
--   • jsonb_strip_nulls omits fields whose column value is SQL NULL, so
--     custom_data stays clean (no null-valued keys injected).
--   • Arrays (interested_colleges, alternate_courses) are stored as
--     comma-separated strings to match how LeadDetailClient reads/writes.
--   • Columns are KEPT (not dropped) — backward-compat for any direct
--     reads during the rollout window. Drop in a future migration.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: ensure column exists
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}';

-- Step 2: back-fill
UPDATE leads
SET custom_data = jsonb_strip_nulls(jsonb_build_object(
  'lead_type',           lead_type,
  'location',            location,
  'twelfth_score',       twelfth_score,
  'preferred_course',    preferred_course,
  'interested_colleges', CASE
                           WHEN interested_colleges IS NOT NULL
                            AND array_length(interested_colleges, 1) > 0
                           THEN array_to_string(interested_colleges, ', ')
                           ELSE NULL
                         END,
  'alternate_courses',   CASE
                           WHEN alternate_courses IS NOT NULL
                            AND array_length(alternate_courses, 1) > 0
                           THEN array_to_string(alternate_courses, ', ')
                           ELSE NULL
                         END,
  'father_phone',        father_phone,
  'decision_maker',      decision_maker,
  'income_status',       income_status,
  'loan_status',         loan_status,
  'comments',            comments
)) || custom_data   -- custom_data wins for any pre-existing keys
WHERE
  lead_type IS NOT NULL OR
  location IS NOT NULL OR
  twelfth_score IS NOT NULL OR
  preferred_course IS NOT NULL OR
  father_phone IS NOT NULL OR
  decision_maker IS NOT NULL OR
  income_status IS NOT NULL OR
  loan_status IS NOT NULL OR
  comments IS NOT NULL OR
  (interested_colleges IS NOT NULL AND array_length(interested_colleges, 1) > 0) OR
  (alternate_courses  IS NOT NULL AND array_length(alternate_courses,  1) > 0);
