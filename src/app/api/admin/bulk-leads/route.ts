import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Bust both caches that depend on lead data for this org.
// 'max' = Next.js 16's stale-while-revalidate profile (next visit serves
// stale immediately, fresh fetch happens in background).
function bustLeadCaches(orgId: string) {
  revalidateTag(`admin-leads:${orgId}`, 'max')
  revalidateTag(`analytics:${orgId}`, 'max')
}

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
    bustLeadCaches(admin.org_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'update_source') {
    const { error } = await supabase.from('leads').update({ source: value }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    bustLeadCaches(admin.org_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    const { error } = await supabase.from('leads').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    bustLeadCaches(admin.org_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'transfer') {
    if (!value) return NextResponse.json({ error: 'No target employee' }, { status: 400 })
    // Verify new owner belongs to same org
    const { data: targetEmp } = await supabase
      .from('employees')
      .select('reports_to, org_id')
      .eq('id', value)
      .single()
    if (!targetEmp || targetEmp.org_id !== admin.org_id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const { error } = await supabase.from('leads')
      .update({ owner_id: value, reporting_manager_id: targetEmp.reports_to || null })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    bustLeadCaches(admin.org_id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
