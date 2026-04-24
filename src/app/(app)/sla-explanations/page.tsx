import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SlaExplanationsClient } from './SlaExplanationsClient'

export default async function SlaExplanationsPage() {
  const employee = await requireAuth()
  const supabase = await createClient()

  const { data: breaches } = await supabase
    .from('sla_breaches')
    .select('*, lead:leads(id,name,phone,main_stage)')
    .eq('owner_id', employee.id)
    .eq('resolution', 'explanation_requested')
    .eq('explanation_status', 'pending')
    .order('created_at', { ascending: false })

  return <SlaExplanationsClient employee={employee} breaches={breaches || []} />
}
