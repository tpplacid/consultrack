import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EmployeesClient } from './EmployeesClient'

export default async function EmployeesPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', employee.org_id)
    .order('name')

  return <EmployeesClient admin={employee} employees={employees || []} />
}
