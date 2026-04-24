import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsClient } from './AnalyticsClient'
import { subDays, format } from 'date-fns'

export default async function AnalyticsPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()
  const orgId = employee.org_id

  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [
    { data: leads },
    { data: employees },
    { data: activities },
    { data: slaBreaches },
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('org_id', orgId),
    supabase.from('employees').select('*').eq('org_id', orgId).eq('is_active', true),
    supabase.from('activities').select('employee_id, activity_type, created_at').eq('org_id', orgId)
      .gte('created_at', `${thirtyDaysAgo}T00:00:00`),
    supabase.from('sla_breaches').select('owner_id, resolution, created_at').eq('org_id', orgId),
  ])

  return (
    <AnalyticsClient
      leads={leads || []}
      employees={employees || []}
      activities={activities || []}
      slaBreaches={slaBreaches || []}
    />
  )
}
