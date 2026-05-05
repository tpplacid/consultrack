-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012 — Per-org lead quota + alert tracking
-- ─────────────────────────────────────────────────────────────────────────────
-- Two new columns on `orgs` for plan ceiling configuration:
--   lead_limit          — integer ceiling (NULL = unlimited)
--   lead_limit_enforced — when false, alerts still fire but creation isn't blocked
--
-- One new table `org_quota_alerts` to record which threshold rows have already
-- been alerted on, so we don't spam the same threshold every lead. Cleared
-- when SA bumps the limit OR when the admin runs a Reset.

alter table orgs
  add column if not exists lead_limit          int,
  add column if not exists lead_limit_enforced boolean not null default true;

create table if not exists org_quota_alerts (
  id        uuid        primary key default gen_random_uuid(),
  org_id    uuid        not null references orgs(id) on delete cascade,
  threshold int         not null check (threshold in (80, 100)),
  sent_at   timestamptz not null default now(),
  unique (org_id, threshold)
);

-- Helps the create-lead path resolve "have we already alerted" in O(1)
create index if not exists idx_org_quota_alerts_org on org_quota_alerts(org_id);
