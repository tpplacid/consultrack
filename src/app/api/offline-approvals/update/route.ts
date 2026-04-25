import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = await requireRole(['ad'])
  const { id, lead_id, action } = await req.json()

  if (!id || !lead_id || !['approved', 'rejected'].includes(action))
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify approval belongs to this org
  const { data: approval } = await supabase
    .from('offline_lead_approvals')
    .select('org_id')
    .eq('id', id)
    .single()

  if (!approval || approval.org_id !== admin.org_id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Update approval status
  const { error: approvalError } = await supabase
    .from('offline_lead_approvals')
    .update({ status: action })
    .eq('id', id)

  if (approvalError) return NextResponse.json({ error: approvalError.message }, { status: 400 })

  // Update lead approved status
  await supabase.from('leads')
    .update({ approved: action === 'approved', approved_by: action === 'approved' ? admin.id : null })
    .eq('id', lead_id)

  return NextResponse.json({ ok: true })
}
