import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { TeamClient } from './TeamClient'

export default async function TeamPage() {
  const employee = await requireRole(['tl', 'ad'])
  const supabase = await createClient()

  // Get direct reports
  const { data: reports } = await supabase
    .from('employees')
    .select('*')
    .eq('reports_to', employee.id)
    .eq('is_active', true)

  // Get leads owned by reports
  const reportIds = (reports || []).map(r => r.id)
  const { data: leads } = await supabase
    .from('leads')
    .select('*, owner:employees!leads_owner_id_fkey(id,name,role)')
    .in('owner_id', reportIds.length > 0 ? reportIds : ['00000000-0000-0000-0000-000000000000'])
    .order('updated_at', { ascending: false })

  return <TeamClient manager={employee} reports={reports || []} leads={leads || []} />
}
