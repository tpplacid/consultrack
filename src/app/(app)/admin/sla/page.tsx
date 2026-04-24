import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminSlaClient } from './AdminSlaClient'

export default async function AdminSlaPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const { data: breaches } = await supabase
    .from('sla_breaches')
    .select(`
      *,
      lead:leads(id,name,phone,main_stage),
      owner:employees!sla_breaches_owner_id_fkey(id,name,role),
      resolver:employees!sla_breaches_resolved_by_fkey(id,name)
    `)
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })
    .limit(200)

  return <AdminSlaClient admin={employee} breaches={breaches || []} />
}
