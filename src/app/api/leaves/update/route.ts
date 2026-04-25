import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = await requireRole(['ad'])
  const { id, status } = await req.json()

  if (!id || !['approved', 'rejected'].includes(status))
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify leave belongs to this org
  const { data: leave } = await supabase.from('leaves').select('*, employee:employees(id,name,role)').eq('id', id).single()
  if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: emp } = await supabase.from('employees').select('org_id').eq('id', leave.employee_id).single()
  if (!emp || emp.org_id !== admin.org_id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabase
    .from('leaves')
    .update({ status, approved_by: admin.id })
    .eq('id', id)
    .select('*, employee:employees(id,name,role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // If approved emergency leave, mark employee on leave
  if (status === 'approved' && leave.leave_type === 'emergency') {
    await supabase.from('employees').update({ is_on_leave: true }).eq('id', leave.employee_id)
  }

  return NextResponse.json({ data })
}
