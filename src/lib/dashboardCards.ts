import { Lead } from '@/types'

export type DashboardCardMetric =
  | { type: 'count' }
  | { type: 'sum'; field: string }

export interface DashboardCardFilter {
  stages?:      string[]
  sources?:     string[]
  owner_roles?: string[]
}

export interface DashboardCard {
  id:      string
  label:   string
  metric:  DashboardCardMetric
  filter?: DashboardCardFilter
}

// Returns leads matching every filter clause in `filter`. Empty/undefined
// arrays are treated as "no constraint" so a card with no filter at all
// counts every lead.
export function applyCardFilter(leads: Lead[], filter?: DashboardCardFilter): Lead[] {
  if (!filter) return leads
  const stageSet  = filter.stages?.length      ? new Set(filter.stages)      : null
  const sourceSet = filter.sources?.length     ? new Set(filter.sources)     : null
  const roleSet   = filter.owner_roles?.length ? new Set(filter.owner_roles) : null
  return leads.filter(l => {
    if (stageSet  && !stageSet.has(l.main_stage))                 return false
    if (sourceSet && !sourceSet.has(l.source))                    return false
    // owner_role isn't on the lead row directly — caller passes a
    // resolver. For now, expose owner role via a join in the dashboard
    // page query and stash it on each lead as `__owner_role` so we can
    // filter without a second pass.
    if (roleSet) {
      const r = (l as unknown as { __owner_role?: string }).__owner_role
      if (!r || !roleSet.has(r)) return false
    }
    return true
  })
}

export function computeCardValue(card: DashboardCard, leads: Lead[]): number {
  const matching = applyCardFilter(leads, card.filter)
  if (card.metric.type === 'count') return matching.length
  // sum: walk custom_data + legacy fee columns
  const field = card.metric.field
  let total = 0
  for (const lead of matching) {
    // 1) custom_data jsonb
    const cd = (lead.custom_data as Record<string, unknown> | null) ?? null
    const cdVal = cd?.[field]
    if (cdVal !== undefined && cdVal !== null && cdVal !== '') {
      const n = Number(cdVal)
      if (Number.isFinite(n)) { total += n; continue }
    }
    // 2) legacy fee columns still living on the lead row
    const legacyVal = (lead as unknown as Record<string, unknown>)[field]
    if (legacyVal !== undefined && legacyVal !== null && legacyVal !== '') {
      const n = Number(legacyVal)
      if (Number.isFinite(n)) total += n
    }
  }
  return total
}

export function formatCardValue(card: DashboardCard, value: number): string {
  if (card.metric.type === 'sum') {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('en-IN')
}

// Friendly description for the dashboard card subtitle. Mostly mirrors
// what the user picked so they can tell two similar cards apart at a
// glance.
export function describeCard(card: DashboardCard): string {
  const parts: string[] = []
  if (card.metric.type === 'count') parts.push('Lead count')
  else parts.push(`Sum of ${card.metric.field}`)

  const f = card.filter
  if (f?.stages?.length)      parts.push(`stage ${f.stages.join('/')}`)
  if (f?.sources?.length)     parts.push(`from ${f.sources.join('/')}`)
  if (f?.owner_roles?.length) parts.push(`${f.owner_roles.join('/')} owners`)
  return parts.join(' · ')
}
