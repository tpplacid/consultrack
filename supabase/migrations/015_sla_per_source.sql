-- Per-source SLA overrides. Falls back to org-wide sla_config when a source
-- is not present in the override map. Shape:
--   { "instagram_dm": { "0": 0.0208, "A": 0.5, "B": 1, ... },
--     "facebook":     { "A": 1, "B": 5, "C": 5, "D": 20 } }
-- Values are in days (decimals allowed — 0.0208 ≈ 30 min). The existing
-- days + hours UI already supports decimals, so no unit migration is needed.

alter table orgs
  add column if not exists sla_config_by_source jsonb not null default '{}'::jsonb;
