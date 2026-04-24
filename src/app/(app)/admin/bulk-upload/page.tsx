import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { BulkUploadClient } from './BulkUploadClient'

export default async function BulkUploadPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', employee.org_id)
    .eq('is_active', true)

  return <BulkUploadClient admin={employee} employees={employees || []} />
}
