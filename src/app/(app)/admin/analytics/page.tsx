import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { subDays, format } from 'date-fns'

const AnalyticsClient = dynamic(() => import('./AnalyticsClient').then(m => m.AnalyticsClient), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-slate-400 text-sm">Loading analytics...</div>,
})

export default async function AnalyticsPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()
  const orgId = employee.org_id

  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  const [
    { data: leads },
    { data: employees },
    { data: activities },
    { data: slaBreaches },
  ] = await Promise.all([
    supabase.from('leads')
      .select('id, created_at, owner_id, main_stage, source, stage_entered_at, interested_colleges, preferred_course')
      .eq('org_id', orgId)
      .gte('created_at', `${ninetyDaysAgo}T00:00:00`)
      .limit(2000),
    supabase.from('employees').select('id, name, role, is_active').eq('org_id', orgId).eq('is_active', true),
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
