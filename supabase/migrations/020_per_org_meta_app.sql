-- Bridge feature for the App Review window. Until Consultrack's central
-- Meta app gets Business Verification + Advanced Access (60-75 days),
-- new orgs are routed through their own Meta app instead. This migration
-- adds the per-org credentials needed when meta_app_mode = 'own'.

alter table orgs
  add column if not exists meta_app_mode text not null default 'central',
  add column if not exists meta_app_id text,
  add column if not exists meta_app_secret text,
  add column if not exists meta_verify_token text;

-- Constrained values; future modes (e.g. 'system_user') can be added by
-- dropping + recreating the constraint.
alter table orgs drop constraint if exists orgs_meta_app_mode_check;
alter table orgs add constraint orgs_meta_app_mode_check
  check (meta_app_mode in ('central', 'own'));

create index if not exists idx_orgs_meta_app_mode on orgs(meta_app_mode);
create index if not exists idx_orgs_meta_verify_token on orgs(meta_verify_token)
  where meta_verify_token is not null;
