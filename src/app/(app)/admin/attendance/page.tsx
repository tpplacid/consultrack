import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminAttendanceClient } from './AdminAttendanceClient'

export default async function AdminAttendancePage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const [{ data: records }, { data: org }] = await Promise.all([
    supabase
      .from('attendance')
      .select('*, employee:employees(id,name,role)')
      .order('work_date', { ascending: false })
      .limit(200),
    supabase
      .from('orgs')
      .select('id, require_attendance_key')
      .eq('id', employee.org_id)
      .single(),
  ])

  return (
    <AdminAttendanceClient
      admin={employee}
      records={records || []}
      orgId={employee.org_id}
      requireKey={org?.require_attendance_key ?? true}
    />
  )
}
