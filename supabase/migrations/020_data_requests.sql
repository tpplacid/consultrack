-- Org-admin-initiated, SA-approved data requests. Two types:
--   export → SA approves → server generates CSV bundle of the org's data
--            and stores a signed URL the org admin can download.
--   reset  → SA approves → server wipes the org's lead data (leads,
--            activities, sla_breaches, offline_lead_approvals, lead_views).
--            Keeps employees, org config, integrations intact so the org
--            can re-onboard cleanly.

create table if not exists data_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  requested_by_employee_id uuid not null references employees(id) on delete restrict,
  request_type text not null check (request_type in ('export', 'reset')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed', 'failed')),
  reason text,                                  -- org admin's note explaining why
  rejection_reason text,                        -- SA's note when rejecting
  sa_decided_by text,                           -- SA email at decision time
  sa_decided_at timestamptz,
  completed_at timestamptz,
  export_url text,                              -- signed download URL (export only)
  export_expires_at timestamptz,                -- when export_url stops working
  failure_reason text,                          -- captured if execution after approval errors
  created_at timestamptz not null default now()
);

alter table data_requests enable row level security;

drop policy if exists "data_requests_authenticated_all" on data_requests;
create policy "data_requests_authenticated_all" on data_requests
  for all to authenticated using (true) with check (true);
-- App-level auth checks on every endpoint scope by org_id; the
-- permissive RLS keeps the policy out of the way during normal flows.

create index if not exists idx_data_requests_org_status on data_requests(org_id, status, created_at desc);
create index if not exists idx_data_requests_pending on data_requests(status, request_type, created_at desc)
  where status = 'pending';
