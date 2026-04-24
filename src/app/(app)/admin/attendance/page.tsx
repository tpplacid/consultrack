import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminAttendanceClient } from './AdminAttendanceClient'

export default async function AdminAttendancePage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const { data: records } = await supabase
    .from('attendance')
    .select('*, employee:employees(id,name,role)')
    .order('work_date', { ascending: false })
    .limit(200)

  return <AdminAttendanceClient admin={employee} records={records || []} />
}
