// Shared types + small helpers for the data-request approval flow.
// The CSV-export builder and the wipe routine live here so both SA
// approval endpoints can call them and the unit shape stays consistent.

import type { createAdminClient } from '@/lib/supabase/admin'

export type DataRequestType   = 'export' | 'reset'
export type DataRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'failed'

export interface DataRequest {
  id: string
  org_id: string
  requested_by_employee_id: string
  request_type: DataRequestType
  status: DataRequestStatus
  reason: string | null
  rejection_reason: string | null
  sa_decided_by: string | null
  sa_decided_at: string | null
  completed_at: string | null
  export_url: string | null
  export_expires_at: string | null
  failure_reason: string | null
  created_at: string
}

// ── Reset (data wipe) ─────────────────────────────────────────
// Order matters: child rows first to satisfy FK constraints. We
// deliberately keep the org row, employees, integrations, settings,
// custom field layouts, etc. so the org can keep using the platform
// after the wipe.
export async function executeReset(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
): Promise<{ ok: true; deleted: Record<string, number> } | { ok: false; error: string }> {
  const counts: Record<string, number> = {}
  const tables = [
    'activities',
    'sla_breaches',
    'offline_lead_approvals',
    'lead_views',
    'leads',
    'org_quota_alerts',
  ]

  for (const t of tables) {
    const { error, count } = await supabase
      .from(t)
      .delete({ count: 'exact' })
      .eq('org_id', orgId)
    if (error) {
      // lead_views, sla_breaches, etc. may not exist on older deployments —
      // ignore "relation does not exist" so the flow doesn't get stuck.
      if (error.code === '42P01') continue
      return { ok: false, error: `${t}: ${error.message}` }
    }
    counts[t] = count ?? 0
  }
  return { ok: true, deleted: counts }
}

// ── Export (CSV bundle) ───────────────────────────────────────
// Returns a single CSV string with leads + their resolved owner +
// custom_data flattened. Activities and other auxiliary tables are
// out of scope for v1 — admins overwhelmingly want lead data.
export async function buildExportCsv(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
): Promise<string> {
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id, name, phone, source, main_stage, sub_stage, approved,
      created_at, updated_at, stage_entered_at, sla_deadline,
      next_followup_at, custom_data,
      owner:employees!leads_owner_id_fkey(name, email, role)
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  const rows = leads ?? []

  // Collect every custom_data key across the export so the CSV has
  // consistent columns regardless of which leads happen to have which
  // custom fields populated.
  const customKeys = new Set<string>()
  for (const r of rows) {
    const cd = r.custom_data as Record<string, unknown> | null
    if (cd) for (const k of Object.keys(cd)) customKeys.add(k)
  }
  const customCols = Array.from(customKeys).sort()

  const baseCols = [
    'id', 'name', 'phone', 'source', 'main_stage', 'sub_stage', 'approved',
    'owner_name', 'owner_email', 'owner_role',
    'created_at', 'updated_at', 'stage_entered_at',
    'sla_deadline', 'next_followup_at',
  ]
  const header = [...baseCols, ...customCols.map(k => `cd:${k}`)].map(csvEscape).join(',')

  const lines = [header]
  for (const r of rows) {
    const ownerRel = r.owner as { name?: string; email?: string; role?: string } | { name?: string; email?: string; role?: string }[] | null
    const owner = Array.isArray(ownerRel) ? ownerRel[0] : ownerRel
    const cd    = (r.custom_data ?? {}) as Record<string, unknown>
    const cells = [
      String(r.id ?? ''),
      String(r.name ?? ''),
      String(r.phone ?? ''),
      String(r.source ?? ''),
      String(r.main_stage ?? ''),
      String(r.sub_stage ?? ''),
      r.approved ? 'true' : 'false',
      String(owner?.name  ?? ''),
      String(owner?.email ?? ''),
      String(owner?.role  ?? ''),
      String(r.created_at        ?? ''),
      String(r.updated_at        ?? ''),
      String(r.stage_entered_at  ?? ''),
      String(r.sla_deadline      ?? ''),
      String(r.next_followup_at  ?? ''),
      ...customCols.map(k => formatCustom(cd[k])),
    ]
    lines.push(cells.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCustom(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
