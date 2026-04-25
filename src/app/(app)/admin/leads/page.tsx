import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminLeadsClient } from './AdminLeadsClient'

export default async function AdminLeadsPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const [{ data: leads }, { data: employees }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, owner:employees!leads_owner_id_fkey(id,name,role)')
      .eq('org_id', employee.org_id)
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase
      .from('employees')
      .select('id, name, role, email, org_id, reports_to, is_active')
      .eq('org_id', employee.org_id)
      .eq('is_active', true),
  ])

  return <AdminLeadsClient admin={employee} leads={leads || []} employees={employees || []} />
}
