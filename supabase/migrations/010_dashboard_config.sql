-- Migration 010 — Per-org dashboard customisation
-- Lets admins pick which 3 pipeline stages render as the main dashboard stat cards.

alter table orgs
  add column if not exists dashboard_stage_keys text[] not null default array['C','B','F'];
