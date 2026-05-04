-- Meta integration columns
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS meta_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_setup_sent_at timestamptz DEFAULT NULL;

-- Allow auto-allocation toggle per employee
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS auto_allocate boolean NOT NULL DEFAULT true;

-- Helpful index for page-id lookups
CREATE INDEX IF NOT EXISTS idx_orgs_meta_page_id
  ON orgs ((meta_config->>'page_id'))
  WHERE meta_config->>'page_id' IS NOT NULL;
