// Single source of truth for "how long until this lead's deadline at the
// given stage". Per-source override takes precedence over the org-wide
// sla_config; if neither has a value for the stage, returns null (no
// deadline applies, e.g. terminal stages or referral/offline excluded sources).

export type SlaConfig = Record<string, number>
export type SlaConfigBySource = Record<string, Record<string, number>>

interface ComputeArgs {
  stage:                string
  source:               string | null | undefined
  orgSlaConfig:         SlaConfig | null | undefined
  orgSlaConfigBySource: SlaConfigBySource | null | undefined
  from?:                Date
}

export function computeSlaDeadline({
  stage, source,
  orgSlaConfig, orgSlaConfigBySource,
  from = new Date(),
}: ComputeArgs): Date | null {
  if (!stage) return null

  const override = source ? orgSlaConfigBySource?.[source] : undefined
  const days     = override?.[stage] ?? orgSlaConfig?.[stage] ?? null
  if (days == null) return null

  return new Date(from.getTime() + days * 86400000)
}

// IG signal sources are created by webhook code, not by org admins, so they
// don't appear in the org's lead_sources config. The SLA admin merges these
// with the org-configured sources (see SlaThresholdsClient).
export const DEFAULT_SLA_KEY = '__default'

export const IG_SIGNAL_SOURCES = [
  { key: 'instagram_dm',      label: 'Instagram DM',      sla_excluded: false },
  { key: 'instagram_comment', label: 'Instagram Comment', sla_excluded: false },
  { key: 'instagram_mention', label: 'Instagram Mention', sla_excluded: false },
]
