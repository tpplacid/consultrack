import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AttendanceClient } from './AttendanceClient'

export default async function AttendancePage() {
  const employee = await requireAuth()
  const supabase = await createClient()

  const [{ data: records }, { data: org }] = await Promise.all([
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
  ])

  return (
    <AttendanceClient
      employee={employee}
      records={records || []}
      requireKey={org?.require_attendance_key ?? true}
    />
  )
}
