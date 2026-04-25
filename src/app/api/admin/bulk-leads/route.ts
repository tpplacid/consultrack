import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = await requireRole(['ad'])
  const { action, ids, value } = await req.json()

  if (!ids || ids.length === 0) return NextResponse.json({ error: 'No leads selected' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify all leads belong to this org
  const { data: check } = await supabase
    .from('leads').select('id').in('id', ids).eq('org_id', admin.org_id)
  if (!check || check.length !== ids.length)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (action === 'update_stage') {
    const { error } = await supabase.from('leads')
      .update({ main_stage: value, stage_entered_at: new Date().toISOString() })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'update_source') {
    const { error } = await supabase.from('leads').update({ source: value }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    const { error } = await supabase.from('leads').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
