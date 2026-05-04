import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_STAGES, DEFAULT_ROLES, DEFAULT_FLOWS } from '@/context/orgDefaults'

// POST /api/superadmin/orgs/[orgId]/reset
// Wipes all pipeline, roles, leads, and activities for a SANDBOX org, then
// re-seeds with defaults. Employees and auth users are preserved.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { orgId } = await params
  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('orgs').select('is_sandbox').eq('id', orgId).single()
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })
  if (!org.is_sandbox) {
    return NextResponse.json(
      { error: 'Reset is only available for sandbox orgs.' },
      { status: 400 },
    )
  }

  // Wipe dynamic data
  await Promise.all([
    supabase.from('org_stages').delete().eq('org_id', orgId),
    supabase.from('org_stage_substages').delete().eq('org_id', orgId),
    supabase.from('org_stage_flows').delete().eq('org_id', orgId),
    supabase.from('org_roles').delete().eq('org_id', orgId),
    supabase.from('leads').delete().eq('org_id', orgId),
    supabase.from('activities').delete().eq('org_id', orgId),
    supabase.from('sla_breaches').delete().eq('org_id', orgId),
  ])

  // Re-seed stages
  for (const s of DEFAULT_STAGES) {
    const { data: inserted } = await supabase
      .from('org_stages')
      .insert({ org_id: orgId, key: s.key, label: s.label, color_bg: s.color_bg, color_text: s.color_text, position: s.position, sla_days: s.sla_days, is_won: s.is_won, is_lost: s.is_lost })
      .select().single()
    if (inserted && s.substages.length > 0) {
      await supabase.from('org_stage_substages').insert(
        s.substages.map((label, i) => ({ org_id: orgId, stage_key: s.key, label, position: i }))
      )
    }
  }
  await supabase.from('org_stage_flows').insert(
    DEFAULT_FLOWS.map(f => ({ org_id: orgId, ...f }))
  )

  // Re-seed roles
  for (const r of DEFAULT_ROLES) {
    await supabase.from('org_roles').insert({ org_id: orgId, key: r.key, label: r.label, level: r.level, position: r.position, can_view_team: r.can_view_team, can_transfer_leads: r.can_transfer_leads, can_approve_leads: r.can_approve_leads, can_access_admin: r.can_access_admin })
  }

  return NextResponse.json({ success: true })
}
