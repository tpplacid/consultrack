import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE /api/superadmin/orgs/[orgId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { orgId } = await params
  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('orgs').select('is_sandbox, name').eq('id', orgId).single()
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })
  if (org.is_sandbox) {
    return NextResponse.json(
      { error: 'Cannot delete sandbox org — use Reset to Defaults instead.' },
      { status: 400 },
    )
  }

  // Delete auth users for employees (best-effort).
  // Single listUsers call → in-memory map, instead of one listUsers per
  // employee (was N×listUsers, now 1×listUsers).
  const { data: emps } = await supabase
    .from('employees').select('email').eq('org_id', orgId)
  if (emps && emps.length > 0) {
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const emailToId = new Map<string, string>()
    for (const u of authData?.users ?? []) {
      if (u.email) emailToId.set(u.email.toLowerCase(), u.id)
    }
    for (const emp of emps) {
      const id = emailToId.get((emp.email || '').toLowerCase())
      if (id) await supabase.auth.admin.deleteUser(id)
    }
  }

  const { error } = await supabase.from('orgs').delete().eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await params
  const body = await req.json()
  const { name, slug, features, brand_palette, meta_config, instagram_config, is_live, lead_limit, lead_limit_enforced } = body

  const supabase = createAdminClient()

  // Detect a limit raise so we can clear stale 80/100% alerts — otherwise a
  // raise would leave the alerts table populated and future thresholds (now
  // calculated from the new ceiling) wouldn't fire.
  let limitRaised = false
  if (lead_limit !== undefined) {
    const { data: prior } = await supabase.from('orgs').select('lead_limit').eq('id', orgId).single()
    const oldLimit = (prior?.lead_limit as number | null) ?? null
    const newLimit = lead_limit as number | null
    limitRaised = (oldLimit ?? 0) < (newLimit ?? Infinity) && newLimit !== oldLimit
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (slug !== undefined) updates.slug = slug
  if (features !== undefined) updates.features = features
  if (brand_palette !== undefined) updates.brand_palette = brand_palette
  if (meta_config !== undefined) updates.meta_config = meta_config
  if (instagram_config !== undefined) updates.instagram_config = instagram_config
  if (is_live !== undefined) updates.is_live = is_live
  if (lead_limit !== undefined) updates.lead_limit = lead_limit
  if (lead_limit_enforced !== undefined) updates.lead_limit_enforced = lead_limit_enforced

  const { data, error } = await supabase
    .from('orgs')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Side-effects after a successful save
  if (limitRaised) {
    // Clear stale alert rows so the next 80%/100% crossings can fire
    await supabase.from('org_quota_alerts').delete().eq('org_id', orgId)
  }
  // Bust the quota cache regardless — limit/enforced may have changed
  if (lead_limit !== undefined || lead_limit_enforced !== undefined) {
    const { revalidateTag } = await import('next/cache')
    revalidateTag(`lead-count:${orgId}`, 'max')
  }

  return NextResponse.json({ org: data })
}
