// Lead quota helpers — count, alert thresholds, hard enforcement.
//
// Used by every server-side lead-create path (create-offline, bulk-leads,
// meta webhook). Cached count is busted via revalidateTag in the same
// invalidation paths we already wired for /admin/leads + /admin/analytics.

import { unstable_cache, revalidateTag } from 'next/cache'
import { createAdminClient } from './supabase/admin'

export interface QuotaState {
  count:      number
  limit:      number | null   // null = unlimited
  enforced:   boolean
  pct:        number          // 0–100, or 0 when unlimited
  remaining:  number | null   // null when unlimited
  atLimit:    boolean         // true when enforced && count >= limit
}

/**
 * Read the org's quota state. Cached for 60s per org and tagged
 * `lead-count:<orgId>` so it's busted by mutations.
 */
export function getQuotaState(orgId: string): Promise<QuotaState> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const [{ count }, { data: org }] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('orgs').select('lead_limit, lead_limit_enforced').eq('id', orgId).single(),
      ])
      const c     = count ?? 0
      const limit = (org?.lead_limit as number | null) ?? null
      const enf   = (org?.lead_limit_enforced as boolean | undefined) ?? true
      const pct   = limit && limit > 0 ? Math.round((c / limit) * 100) : 0
      return {
        count:     c,
        limit,
        enforced:  enf,
        pct,
        remaining: limit !== null ? Math.max(0, limit - c) : null,
        atLimit:   enf && limit !== null && c >= limit,
      }
    },
    ['lead-quota', orgId],
    { revalidate: 60, tags: [`lead-count:${orgId}`] },
  )()
}

export function bustQuotaCache(orgId: string) {
  revalidateTag(`lead-count:${orgId}`, 'max')
}

/**
 * Throw a friendly Error if the org is over its hard limit.
 * Caller is responsible for catching and returning a 4xx.
 */
export async function assertCanCreateLead(orgId: string): Promise<QuotaState> {
  const state = await getQuotaState(orgId)
  if (state.atLimit) {
    throw new Error(
      `Lead limit reached (${state.count}/${state.limit}). ` +
      'Upgrade your plan or export & reset to add more leads.',
    )
  }
  return state
}

/**
 * After a lead is created, check if we've crossed an alert threshold (80/100)
 * and, if so, atomically record the alert and create a support ticket so the
 * SA sees it in /superadmin/support and the org admin gets notified too.
 *
 * Idempotent — the unique (org_id, threshold) constraint means a second
 * insert at the same threshold is a no-op (we swallow the duplicate error).
 */
export async function checkAndAlertQuota(orgId: string, justCreatedDelta = 1): Promise<void> {
  const state = await getQuotaState(orgId)
  if (!state.limit) return // no ceiling configured

  // We just created N leads — re-evaluate pct against the new total
  const newCount = state.count + justCreatedDelta
  const newPct   = Math.round((newCount / state.limit) * 100)

  const supabase = createAdminClient()
  const thresholds = [100, 80].filter(t => newPct >= t)

  for (const threshold of thresholds) {
    // Insert; on conflict (already alerted), do nothing
    const { error } = await supabase
      .from('org_quota_alerts')
      .insert({ org_id: orgId, threshold })

    // Postgres unique-violation = 23505. Anything else: log & skip.
    if (error && !error.message.includes('duplicate')) {
      console.error('[checkAndAlertQuota] insert error:', error.message)
      continue
    }
    if (error) continue // duplicate → already alerted, skip ticket creation

    // Fresh alert — fan out: support ticket (SA inbox) + org admin email is
    // implicit because the org admin sees their own tickets in /admin/support.
    const { data: org } = await supabase.from('orgs').select('name').eq('id', orgId).single()
    await supabase.from('support_tickets').insert({
      org_id: orgId,
      employee_id: null,
      org_name: org?.name ?? '',
      employee_name: 'System',
      employee_email: 'system@consultrack',
      subject: threshold === 100
        ? `🚨 Lead limit reached (${newCount}/${state.limit})`
        : `⚠️ Lead usage at ${threshold}% (${newCount}/${state.limit})`,
      message: threshold === 100
        ? `${org?.name ?? 'This org'} has hit its lead ceiling. Lead creation is ${state.enforced ? 'now blocked' : 'still permitted (enforcement is OFF)'}. Bump the limit or reach out to the client.`
        : `${org?.name ?? 'This org'} is at ${threshold}% of its lead quota (${newCount}/${state.limit}). Consider reaching out about an upgrade.`,
      type: 'quota_alert',
      feature_key: null,
      status: 'open',
    })
  }
}

/** Clear all alert rows for an org — call this when SA raises the limit
 *  OR when the admin runs a Reset, so future thresholds can fire again. */
export async function clearQuotaAlerts(orgId: string) {
  const supabase = createAdminClient()
  await supabase.from('org_quota_alerts').delete().eq('org_id', orgId)
  bustQuotaCache(orgId)
}
