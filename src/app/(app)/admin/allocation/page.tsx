import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AllocationClient } from './AllocationClient'
import { format } from 'date-fns'

export default async function AllocationPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: employees }, { data: weekoffs }, { data: leadCounts }, { data: activities }] = await Promise.all([
    supabase.from('employees').select('*').eq('org_id', employee.org_id).order('name'),
    supabase.from('weekoffs').select('*').eq('org_id', employee.org_id),
    supabase.from('leads').select('owner_id').eq('org_id', employee.org_id),
    supabase.from('activities').select('employee_id').eq('org_id', employee.org_id)
      .gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
  ])

  // Build lead count map
  const leadCountMap: Record<string, number> = {}
  for (const l of leadCounts || []) {
    if (l.owner_id) leadCountMap[l.owner_id] = (leadCountMap[l.owner_id] || 0) + 1
  }

  // Build activity count map
  const activityCountMap: Record<string, number> = {}
  for (const a of activities || []) {
    activityCountMap[a.employee_id] = (activityCountMap[a.employee_id] || 0) + 1
  }

  return (
    <AllocationClient
      admin={employee}
      employees={employees || []}
      weekoffs={weekoffs || []}
      leadCounts={leadCountMap}
      activityCounts={activityCountMap}
    />
  )
}
