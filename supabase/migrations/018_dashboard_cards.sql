-- Free-form dashboard card definitions per org. Each entry:
--   {
--     id: <uuid>,
--     label: <string>,
--     metric: { type: 'count' } | { type: 'sum', field: <currency-field-key> },
--     filter?: {
--       stages?: string[],
--       sources?: string[],
--       owner_roles?: string[]
--     }
--   }
-- Existing orgs default to [] so the dashboard falls back to the legacy
-- dashboard_stage_keys + hardcoded Total/Revenue cards until an admin
-- configures here. Once they save anything, dashboard_cards takes over.

alter table orgs
  add column if not exists dashboard_cards jsonb not null default '[]'::jsonb;
