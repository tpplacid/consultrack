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
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .from('employees')
      .select('*')
      .eq('is_active', true),
  ])

  return <AdminLeadsClient admin={employee} leads={leads || []} employees={employees || []} />
}
