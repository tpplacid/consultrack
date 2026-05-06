-- Distinguishes "this org has explicitly chosen 0 dashboard cards" from
-- "this org has never visited Settings -> Dashboard". Without it, the
-- settings page can't tell whether to seed legacy-style cards or honour
-- the empty list the admin just saved.

alter table orgs
  add column if not exists dashboard_cards_configured boolean not null default false;

-- Backfill: any org that has at least one entry in dashboard_cards has
-- clearly been here already, so flag them configured. Orgs with '[]'
-- (the column default) keep configured=false and continue to see the
-- seeded legacy cards until they explicitly save in Settings.
update orgs set dashboard_cards_configured = true
  where jsonb_array_length(coalesce(dashboard_cards, '[]'::jsonb)) > 0;
