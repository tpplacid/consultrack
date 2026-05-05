import { NextRequest, NextResponse } from 'next/server'
import { getEmployee } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Same fix as POST /api/support/tickets — auth.getUser().id !== employee.id.
  // getEmployee() looks up by email which is the actual link.
  const employee = await getEmployee()
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify ticket belongs to this org
  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, org_id')
    .eq('id', id)
    .single()
  if (!ticket || ticket.org_id !== employee.org_id) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const { data: message, error } = await admin
    .from('ticket_messages')
    .insert({
      ticket_id: id,
      sender_type: 'org',
      sender_name: employee.name,
      body: body.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Bump updated_at on ticket so superadmin sees new activity
  await admin.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ message })
}
