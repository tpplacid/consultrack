import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearQuotaAlerts } from '@/lib/leadQuota'

// POST /api/admin/reset-org
// Body: {
//   confirmSlug: string,                     // must match the org slug exactly
//   wipe: {
//     leads:        boolean,                 // always true (the point of reset)
//     activities:   boolean,                 // default true (audit trail)
//     breaches:     boolean,                 // default true (deadline log)
//     layouts:      boolean,                 // default false (field schema)
//     pipeline:     boolean,                 // default false (stages/sources/roles)
//     employees:    boolean,                 // default false (team)
//   }
// }
//
// Admin-only. Wipes the requested data for the caller's own org.
// NOTE: this never touches another org's data — orgId is always pulled from
// the session, never accepted from the request body.
export async function POST(req: NextRequest) {
  const employee = await requireRole(['ad'])
  const orgId = employee.org_id
  const supabase = createAdminClient()

  const body = await req.json().catch(() => ({}))
  const confirmSlug = String(body?.confirmSlug ?? '').trim()
  const wipe = (body?.wipe ?? {}) as Record<string, boolean>

  // Verify slug match — extra confirmation barrier in addition to admin role.
  const { data: org } = await supabase
    .from('orgs')
    .select('slug, name')
    .eq('id', orgId)
    .single()
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })
  if (org.slug !== confirmSlug) {
    return NextResponse.json({ error: 'Confirmation slug does not match' }, { status: 400 })
  }

  // Track what was wiped for the audit-log entry
  const wiped: string[] = []

  // Order matters: child tables first (FKs), then parents.
  // Activities & breaches reference lead_id, so wipe them before leads.
  if (wipe.activities !== false) {
    const { error } = await supabase.from('activities').delete().eq('org_id', orgId)
    if (error) return NextResponse.json({ error: `activities: ${error.message}` }, { status: 500 })
    wiped.push('activities')
  }
  if (wipe.breaches !== false) {
    const { error } = await supabase.from('sla_breaches').delete().eq('org_id', orgId)
    if (error) return NextResponse.json({ error: `sla_breaches: ${error.message}` }, { status: 500 })
    wiped.push('sla_breaches')
  }
  // offline_lead_approvals also reference lead_id — always wipe these so
  // we don't leave dangling FKs when leads go.
  await supabase.from('offline_lead_approvals').delete().eq('org_id', orgId)

  // Leads — always wiped (that's the reset)
  if (wipe.leads !== false) {
    const { error } = await supabase.from('leads').delete().eq('org_id', orgId)
    if (error) return NextResponse.json({ error: `leads: ${error.message}` }, { status: 500 })
    wiped.push('leads')
  }

  // Optional: field layouts (org schema)
  if (wipe.layouts === true) {
    await supabase.from('org_field_layouts').delete().eq('org_id', orgId)
    wiped.push('field_layouts')
  }

  // Optional: pipeline (stages, sub-stages, flows, roles, sources)
  if (wipe.pipeline === true) {
    await Promise.all([
      supabase.from('org_stages').delete().eq('org_id', orgId),
      supabase.from('org_stage_substages').delete().eq('org_id', orgId),
      supabase.from('org_stage_flows').delete().eq('org_id', orgId),
      supabase.from('org_roles').delete().eq('org_id', orgId),
    ])
    // lead_sources is a JSONB column on orgs — clear it
    await supabase.from('orgs').update({ lead_sources: null }).eq('id', orgId)
    wiped.push('pipeline')
  }

  // Optional: employees (this is destructive — auth users go too)
  if (wipe.employees === true) {
    // Don't kill the admin who triggered the reset — they'd lock themselves out
    const { data: emps } = await supabase
      .from('employees')
      .select('id, email')
      .eq('org_id', orgId)
      .neq('id', employee.id)
    if (emps && emps.length > 0) {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const emailToId = new Map<string, string>()
      for (const u of authData?.users ?? []) {
        if (u.email) emailToId.set(u.email.toLowerCase(), u.id)
      }
      for (const emp of emps) {
        const aid = emailToId.get((emp.email || '').toLowerCase())
        if (aid) await supabase.auth.admin.deleteUser(aid)
      }
      await supabase.from('employees').delete().in('id', emps.map(e => e.id))
    }
    wiped.push('employees (excl. you)')
  }

  // Reset alert tracking so future 80/100% crossings can fire
  await clearQuotaAlerts(orgId)

  // Bust dependent caches
  revalidateTag(`admin-leads:${orgId}`, 'max')
  revalidateTag(`analytics:${orgId}`, 'max')
  revalidateTag(`lead-count:${orgId}`, 'max')

  return NextResponse.json({
    ok: true,
    org: org.name,
    wiped,
    timestamp: new Date().toISOString(),
  })
}
