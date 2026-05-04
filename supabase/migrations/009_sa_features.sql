-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009 — Superadmin features: test org + admin password reset codes
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Sandbox flag on orgs (test org visible only to SA)
alter table orgs
  add column if not exists is_sandbox boolean not null default false;

-- 2. Admin password reset codes (SA-initiated)
--    SA generates a 6-digit code for any employee.
--    The employee enters it on the login page to set a new password.
create table if not exists password_reset_codes (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references orgs(id) on delete cascade,
  employee_id uuid        not null references employees(id) on delete cascade,
  email       text        not null,
  code        char(6)     not null,
  used_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 minutes'),
  created_at  timestamptz not null default now()
);

-- Only the SA (service role) touches this table — no RLS needed.
-- Index for fast lookup by email + code
create index if not exists idx_prc_email_code on password_reset_codes(email, code);
