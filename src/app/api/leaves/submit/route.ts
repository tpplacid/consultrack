import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const employee = await requireAuth()
  const { leave_date, leave_type, reason } = await req.json()

  if (!leave_date) return NextResponse.json({ error: 'Leave date required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('leaves').insert({
    org_id: employee.org_id,
    employee_id: employee.id,
    leave_date,
    leave_type,
    reason: reason || null,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
