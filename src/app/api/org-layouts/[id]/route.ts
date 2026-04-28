import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/org-layouts/[id] — update section name, fields, or position
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const employee = await requireRole(['ad']).catch(() => null)
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  // Confirm the section belongs to this org before updating
  const { data: existing } = await supabase
    .from('org_field_layouts')
    .select('org_id')
    .eq('id', id)
    .single()

  if (!existing || existing.org_id !== employee.org_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.section_name !== undefined) updates.section_name = body.section_name
  if (body.fields !== undefined)       updates.fields = body.fields
  if (body.position !== undefined)     updates.position = body.position

  const { data, error } = await supabase
    .from('org_field_layouts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ section: data })
}

// DELETE /api/org-layouts/[id] — delete a section
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const employee = await requireRole(['ad']).catch(() => null)
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('org_field_layouts')
    .select('org_id')
    .eq('id', id)
    .single()

  if (!existing || existing.org_id !== employee.org_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase.from('org_field_layouts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
