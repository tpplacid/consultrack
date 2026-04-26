import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*, ticket_messages(id, sender_type, sender_name, body, created_at)')
    .order('created_at', { ascending: false })

  return NextResponse.json({ tickets: tickets ?? [] })
}
