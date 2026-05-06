-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013 — Instagram integration (bifurcated from Meta/Facebook)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Per-org Instagram config (IG Business Account ID + access token + optional CAPI dataset)
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS instagram_config       jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instagram_setup_sent_at timestamptz DEFAULT NULL;

-- 2. Instagram-specific lead deduplication column
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS instagram_lead_id text DEFAULT NULL;

-- 3. Extend source CHECK to include 'instagram'
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN ('meta', 'offline', 'referral', 'instagram'));

-- 4. Fast lookup: resolve org by IG Business Account ID
CREATE INDEX IF NOT EXISTS idx_orgs_instagram_account_id
  ON orgs ((instagram_config->>'ig_account_id'))
  WHERE instagram_config->>'ig_account_id' IS NOT NULL;

-- 5. Fast dedup lookup on instagram_lead_id
CREATE INDEX IF NOT EXISTS idx_leads_instagram_lead_id
  ON leads(instagram_lead_id)
  WHERE instagram_lead_id IS NOT NULL;
