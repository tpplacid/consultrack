import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgFeatures } from '@/lib/orgFeatures'
import { FeatureGate } from '@/components/FeatureGate'
import { AdminAttendanceClient } from '../../attendance/AdminAttendanceClient'

export default async function TeamAttendancePage() {
  const employee = await requireRole(['ad'])
  const features = await getOrgFeatures(employee.org_id)
  if (!features.attendance) {
    return <FeatureGate featureKey="attendance" featureLabel="Attendance" description="Track employee clock-in/out, manage leave requests, and configure weekoffs for your team." />
  }
  const supabase = createAdminClient()
  const { data: orgEmps } = await supabase.from('employees').select('id').eq('org_id', employee.org_id)
  const empIds = (orgEmps || []).map(e => e.id)
  const [{ data: records }, { data: org }] = await Promise.all([
    supabase.from('attendance').select('*, employee:employees!employee_id(id,name,role)').in('employee_id', empIds.length > 0 ? empIds : ['00000000-0000-0000-0000-000000000000']).order('work_date', { ascending: false }).limit(500),
    supabase.from('orgs').select('id, require_attendance_key').eq('id', employee.org_id).single(),
  ])
  return <AdminAttendanceClient admin={employee} records={records || []} orgId={employee.org_id} requireKey={org?.require_attendance_key ?? true} />
}
