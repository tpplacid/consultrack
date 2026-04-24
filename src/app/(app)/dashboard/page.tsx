import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const employee = await requireAuth()
  const supabase = await createClient()

  // Fetch leads based on role
  let query = supabase
    .from('leads')
    .select('*, owner:employees!leads_owner_id_fkey(id,name,role), reporting_manager:employees!leads_reporting_manager_id_fkey(id,name)')
    .order('updated_at', { ascending: false })

  if (employee.role === 'ad') {
    // AD sees all
  } else if (employee.role === 'tl') {
    query = query.or(`owner_id.eq.${employee.id},reporting_manager_id.eq.${employee.id}`)
  } else {
    query = query.eq('owner_id', employee.id)
  }

  const { data: leads } = await query.limit(200)

  // Stats
  const stats = {
    total: leads?.length || 0,
    hot: leads?.filter(l => l.main_stage === 'C').length || 0,
    followup: leads?.filter(l => l.main_stage === 'B').length || 0,
    closed: leads?.filter(l => l.main_stage === 'F').length || 0,
  }

  return <DashboardClient employee={employee} leads={leads || []} stats={stats} />
}
