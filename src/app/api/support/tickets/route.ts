import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: employee } = await supabase
    .from('employees')
    .select('id, name, email, org_id')
    .eq('id', user.id)
    .single()

  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

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

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: employee } = await supabase
    .from('employees')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single()

  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (employee.role !== 'ad') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = createAdminClient()
  const { data: tickets } = await admin
    .from('support_tickets')
    .select('*, ticket_messages(id, sender_type, sender_name, body, created_at)')
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tickets: tickets ?? [] })
}
