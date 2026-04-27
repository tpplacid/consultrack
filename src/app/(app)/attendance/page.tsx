import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getOrgFeatures } from '@/lib/orgFeatures'
import { FeatureGate } from '@/components/FeatureGate'
import { AttendanceClient } from './AttendanceClient'
import { format } from 'date-fns'

export default async function AttendancePage() {
  const employee = await requireAuth()
  const features = await getOrgFeatures(employee.org_id)

  if (!features.attendance) {
    return (
      <FeatureGate
        featureKey="attendance"
        featureLabel="Attendance Tracking"
        description="Clock in and out with wifi-based verification, view your attendance history, and manage work hours seamlessly. Contact Consultrack to enable this module for your org."
      />
    )
  }

  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayDayName = format(new Date(), 'EEEE').toLowerCase() // e.g. 'monday'

  const [{ data: records }, { data: org }, { data: weekoffRows }, { data: leaveRows }] = await Promise.all([
    supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .order('work_date', { ascending: false })
      .limit(30),
    supabase
      .from('orgs')
      .select('require_attendance_key')
      .eq('id', employee.org_id)
      .single(),
    supabase
      .from('weekoffs')
      .select('id')
      .eq('employee_id', employee.id)
      .or(`day_of_week.eq.${todayDayName},specific_date.eq.${today}`)
      .limit(1),
    supabase
      .from('leaves')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1),
  ])

  const isWeekoff = (weekoffRows?.length ?? 0) > 0
  const isOnLeave = (leaveRows?.length ?? 0) > 0

  return (
    <AttendanceClient
      employee={employee}
      records={records || []}
      requireKey={org?.require_attendance_key ?? true}
      isWeekoff={isWeekoff}
      isOnLeave={isOnLeave}
    />
  )
}
