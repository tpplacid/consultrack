import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: message, error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: id,
      sender_type: 'superadmin',
      sender_name: 'Consultrack Team',
      body: body.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Bump updated_at on ticket
  await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ message })
}
