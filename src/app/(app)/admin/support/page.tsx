import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import SupportClient from './SupportClient'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*, ticket_messages(id, sender_type, sender_name, body, created_at)')
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })

  return <SupportClient initialTickets={tickets ?? []} />
}
