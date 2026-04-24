import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminLeavesClient } from './AdminLeavesClient'

export default async function AdminLeavesPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const { data: leaves } = await supabase
    .from('leaves')
    .select('*, employee:employees(id,name,role)')
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })

  return <AdminLeavesClient admin={employee} leaves={leaves || []} />
}
