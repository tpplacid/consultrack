import { NextRequest, NextResponse } from 'next/server'
import { getEmployee } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Use the canonical helper (joins by email, the actual identity link
  // between Supabase auth users and our employees table). The previous
  // .eq('id', user.id) lookup was wrong — auth user IDs and employee row
  // IDs are different UUIDs, so this 404'd for every legitimate user.
  const employee = await getEmployee()
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, message, type, feature_key } = await req.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get org name
  const { data: org } = await admin.from('orgs').select('name').eq('id', employee.org_id).single()

  const { data: ticket, error } = await admin.from('support_tickets').insert({
    org_id: employee.org_id,
    employee_id: employee.id,
    org_name: org?.name ?? '',
    employee_name: employee.name,
    employee_email: employee.email ?? '',
    subject: subject.trim(),
    message: message.trim(),
    type: type ?? 'upgrade_request',
    feature_key: feature_key ?? null,
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ticket })
}

export async function GET() {
  const employee = await getEmployee()
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (employee.role !== 'ad') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = createAdminClient()
  const { data: tickets } = await admin
    .from('support_tickets')
    .select('*, ticket_messages(id, sender_type, sender_name, body, created_at)')
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tickets: tickets ?? [] })
}
