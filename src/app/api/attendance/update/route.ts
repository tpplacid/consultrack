import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = await requireRole(['ad'])
  const { id, status, admin_note } = await req.json()

  if (!id || !status) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify attendance record belongs to this org
  const { data: existing } = await supabase
    .from('attendance')
    .select('employee_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: emp } = await supabase.from('employees').select('org_id').eq('id', existing.employee_id).single()
  if (!emp || emp.org_id !== admin.org_id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabase
    .from('attendance')
    .update({
      status,
      admin_note: admin_note ?? null,
      override_approved_by: status === 'present' ? admin.id : undefined,
    })
    .eq('id', id)
    .select('*, employee:employees(id,name,role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
