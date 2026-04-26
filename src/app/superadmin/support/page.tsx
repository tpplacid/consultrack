import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import SuperAdminSupportClient from './SuperAdminSupportClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminSupportPage() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  let { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('*, ticket_messages(id, sender_type, sender_name, body, created_at)')
    .order('created_at', { ascending: false })

  // Fallback if ticket_messages table doesn't exist yet
  if (error) {
    const { data: fallback } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    tickets = (fallback ?? []).map((t: Record<string, unknown>) => ({ ...t, ticket_messages: [] }))
  }

  return <SuperAdminSupportClient initialTickets={tickets ?? []} />
}
