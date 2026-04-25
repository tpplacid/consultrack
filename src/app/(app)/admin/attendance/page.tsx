import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminAttendanceClient } from './AdminAttendanceClient'

export default async function AdminAttendancePage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  // Two-step: get org employee IDs first (works regardless of RLS / missing org_id column)
  const { data: orgEmps } = await supabase
    .from('employees')
    .select('id')
    .eq('org_id', employee.org_id)

  const empIds = (orgEmps || []).map(e => e.id)

  const [{ data: records }, { data: org }] = await Promise.all([
    supabase
      .from('attendance')
      .select('*, employee:employees(id,name,role)')
      .in('employee_id', empIds.length > 0 ? empIds : ['00000000-0000-0000-0000-000000000000'])
      .order('work_date', { ascending: false })
      .limit(500),
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
