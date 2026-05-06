-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014 — Instagram social signals (DMs, Comments, Mentions)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Allow phone to be null — DMs/comments/mentions don't expose phone numbers
ALTER TABLE leads ALTER COLUMN phone DROP NOT NULL;

-- 2. Add dedup columns for each signal type
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS instagram_thread_id  text DEFAULT NULL,  -- sender IGSID (DM dedup per org)
  ADD COLUMN IF NOT EXISTS instagram_comment_id text DEFAULT NULL,  -- comment_id (comment dedup)
  ADD COLUMN IF NOT EXISTS instagram_mention_id text DEFAULT NULL;  -- mention_id (mention dedup)

-- 3. Extend source CHECK to include new signal types
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN (
    'meta', 'offline', 'referral',
    'instagram', 'instagram_dm', 'instagram_comment', 'instagram_mention'
  ));

-- 4. Dedup indexes
-- DM: one lead per sender per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ig_thread_org
  ON leads(org_id, instagram_thread_id)
  WHERE instagram_thread_id IS NOT NULL;

-- Comment: globally unique comment IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ig_comment_id
  ON leads(instagram_comment_id)
  WHERE instagram_comment_id IS NOT NULL;

-- Mention: globally unique mention IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ig_mention_id
  ON leads(instagram_mention_id)
  WHERE instagram_mention_id IS NOT NULL;
