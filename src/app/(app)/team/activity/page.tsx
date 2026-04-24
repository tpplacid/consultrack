import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ActivityTracker } from './ActivityTracker'
import { format } from 'date-fns'

export default async function TeamActivityPage() {
  const employee = await requireRole(['tl', 'ad'])
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('employees')
    .select('*')
    .eq('reports_to', employee.id)
    .eq('is_active', true)

  const today = format(new Date(), 'yyyy-MM-dd')

  // Get today's activity counts per employee
  const reportIds = (reports || []).map(r => r.id)
  const { data: activities } = await supabase
    .from('activities')
    .select('employee_id, created_at')
    .in('employee_id', reportIds.length > 0 ? reportIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  const activityCounts: Record<string, number> = {}
  for (const a of activities || []) {
    activityCounts[a.employee_id] = (activityCounts[a.employee_id] || 0) + 1
  }

  return <ActivityTracker reports={reports || []} activityCounts={activityCounts} today={today} />
}
