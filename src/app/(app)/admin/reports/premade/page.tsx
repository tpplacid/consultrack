import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsClient } from '../../analytics/AnalyticsClient'
import { Lead, Employee } from '@/types'
import { SectionLayout } from '@/lib/fieldLayouts'
import { subDays, format } from 'date-fns'

export default async function PremadeReportsPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()
  const orgId = employee.org_id

  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  const [
    { data: leadsRaw },
    { data: employeesRaw },
    { data: activities },
    { data: slaBreaches },
    { data: sectionsRaw },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, created_at, owner_id, main_stage, source, stage_entered_at, custom_data')
      .eq('org_id', orgId)
      .gte('created_at', `${ninetyDaysAgo}T00:00:00`)
      .limit(2000),
    supabase
      .from('employees')
      .select('id, name, role, is_active')
      .eq('org_id', orgId)
      .eq('is_active', true),
    supabase
      .from('activities')
      .select('employee_id, activity_type, created_at')
      .eq('org_id', orgId)
      .gte('created_at', `${thirtyDaysAgo}T00:00:00`),
    supabase
      .from('sla_breaches')
      .select('owner_id, resolution, created_at')
      .eq('org_id', orgId),
    supabase
      .from('org_field_layouts')
      .select('*')
      .eq('org_id', orgId)
      .order('position', { ascending: true }),
  ])

  return (
    <AnalyticsClient
      leads={(leadsRaw || []) as unknown as Lead[]}
      employees={(employeesRaw || []) as unknown as Employee[]}
      activities={activities || []}
      slaBreaches={slaBreaches || []}
      sections={(sectionsRaw || []) as SectionLayout[]}
    />
  )
}
