import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { LeavesClient } from './LeavesClient'

export default async function LeavesPage() {
  const employee = await requireAuth()
  const supabase = await createClient()

  const { data: leaves } = await supabase
    .from('leaves')
    .select('*')
    .eq('employee_id', employee.id)
    .order('created_at', { ascending: false })

  return <LeavesClient employee={employee} leaves={leaves || []} />
}
