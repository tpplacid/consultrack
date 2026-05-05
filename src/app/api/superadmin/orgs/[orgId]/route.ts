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
  const { name, slug, features, brand_palette, meta_config, is_live } = body

  const supabase = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (slug !== undefined) updates.slug = slug
  if (features !== undefined) updates.features = features
  if (brand_palette !== undefined) updates.brand_palette = brand_palette
  if (meta_config !== undefined) updates.meta_config = meta_config
  if (is_live !== undefined) updates.is_live = is_live

  const { data, error } = await supabase
    .from('orgs')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ org: data })
}
