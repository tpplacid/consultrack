-- Tracks the most recent moment each employee opened a lead. Used to
-- compute "X new messages since you last viewed this lead" banners on
-- the lead detail page so counsellors can immediately see whether
-- there's incoming activity they haven't acknowledged yet.

create table if not exists lead_views (
  employee_id uuid not null references employees(id) on delete cascade,
  lead_id     uuid not null references leads(id)     on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (employee_id, lead_id)
);

alter table lead_views enable row level security;

-- Authenticated users can read + write their own views. App-level code
-- already scopes queries by employee_id, so we keep the policy permissive
-- and rely on the explicit (employee_id, lead_id) keys in queries to
-- prevent cross-user leakage.
drop policy if exists "lead_views_authenticated_all" on lead_views;
create policy "lead_views_authenticated_all" on lead_views
  for all to authenticated
  using (true)
  with check (true);

create index if not exists idx_lead_views_lead on lead_views(lead_id);
