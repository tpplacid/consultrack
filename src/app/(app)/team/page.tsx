import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { TeamClient } from './TeamClient'

export default async function TeamPage() {
  const employee = await requireRole(['tl', 'ad'])
  const supabase = await createClient()

  // For AD: show all org employees. For TL: show only direct reports.
  const { data: reports } = await supabase
    .from('employees')
    .select('*')
    .eq(employee.role === 'ad' ? 'org_id' : 'reports_to', employee.role === 'ad' ? employee.org_id : employee.id)
    .eq('is_active', true)
    .neq('id', employee.id)  // exclude self

  const reportIds = (reports || []).map(r => r.id)

  const { data: leads } = await supabase
    .from('leads')
    .select('*, owner:employees!leads_owner_id_fkey(id,name,role)')
    .in('owner_id', reportIds.length > 0 ? reportIds : ['00000000-0000-0000-0000-000000000000'])
    .order('updated_at', { ascending: false })

  return <TeamClient manager={employee} reports={reports || []} leads={leads || []} />
}
