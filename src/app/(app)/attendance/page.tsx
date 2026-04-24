import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AttendanceClient } from './AttendanceClient'

export default async function AttendancePage() {
  const employee = await requireAuth()
  const supabase = await createClient()

  const { data: records } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employee.id)
    .order('work_date', { ascending: false })
    .limit(30)

  return <AttendanceClient employee={employee} records={records || []} />
}
