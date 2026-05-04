import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AnalyticsClient } from './AnalyticsClient'
import { Lead, Employee } from '@/types'
import { unstable_cache } from 'next/cache'
import { subDays, subMonths, format } from 'date-fns'

// Cache analytics data per org for 3 minutes — safe because each cache key is org-scoped.
const getAnalyticsData = unstable_cache(
  async (orgId: string) => {
    const supabase = createAdminClient()
    const thirtyDaysAgo  = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const twelveMonthsAgo = format(subMonths(new Date(), 12), 'yyyy-MM-dd')

    const [
      { data: leadsRaw },
      { data: employeesRaw },
      { data: activities },
      { data: slaBreaches },
    ] = await Promise.all([
      supabase.from('leads')
        .select('id, name, created_at, owner_id, main_stage, source, stage_entered_at, application_fees, booking_fees, tuition_fees, custom_data')
        .eq('org_id', orgId)
        .gte('created_at', `${twelveMonthsAgo}T00:00:00`)
        .limit(5000),
      supabase.from('employees')
        .select('id, name, role, is_active')
        .eq('org_id', orgId)
        .eq('is_active', true),
      supabase.from('activities')
        .select('employee_id, activity_type, created_at')
        .eq('org_id', orgId)
        .gte('created_at', `${thirtyDaysAgo}T00:00:00`),
      supabase.from('sla_breaches')
        .select('owner_id, resolution, created_at')
        .eq('org_id', orgId),
    ])

    return { leadsRaw, employeesRaw, activities, slaBreaches }
  },
  ['analytics-data'],
  { revalidate: 180 }
)

export default async function AnalyticsPage() {
  const employee = await requireRole(['ad'])
  const { leadsRaw, employeesRaw, activities, slaBreaches } = await getAnalyticsData(employee.org_id)

  return (
    <AnalyticsClient
      leads={(leadsRaw || []) as unknown as Lead[]}
      employees={(employeesRaw || []) as unknown as Employee[]}
      activities={activities || []}
      slaBreaches={slaBreaches || []}
    />
  )
}
