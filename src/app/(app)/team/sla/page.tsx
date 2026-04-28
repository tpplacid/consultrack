import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SlaClient } from './SlaClient'

export default async function TeamSlaPage() {
  const employee = await requireRole(['tl', 'ad'])
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('employees')
    .select('id')
    .eq('reports_to', employee.id)

  const ownerIds = [employee.id, ...(reports || []).map(r => r.id)]

  const { data: breaches } = await supabase
    .from('sla_breaches')
    .select(`
      *,
      lead:leads(id,name,phone,main_stage,sub_stage,current_owner:employees!leads_owner_id_fkey(id,name,role)),
      breach_owner:employees!sla_breaches_owner_id_fkey(id,name,role)
    `)
    .in('owner_id', ownerIds)
    .order('created_at', { ascending: false })

  return <SlaClient employee={employee} breaches={breaches || []} />
}
