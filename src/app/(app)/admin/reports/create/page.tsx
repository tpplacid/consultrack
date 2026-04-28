import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Employee } from '@/types'
import { SectionLayout } from '@/lib/fieldLayouts'
import { ReportBuilderClient } from './ReportBuilderClient'

export default async function CreateReportPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const [{ data: employeesRaw }, { data: layouts }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, name, role, is_active')
      .eq('org_id', employee.org_id)
      .eq('is_active', true),
    adminSupabase
      .from('org_field_layouts')
      .select('*')
      .eq('org_id', employee.org_id)
      .order('position', { ascending: true }),
  ])

  return (
    <ReportBuilderClient
      orgId={employee.org_id}
      employeeId={employee.id}
      employees={(employeesRaw || []) as unknown as Employee[]}
      sections={(layouts || []) as SectionLayout[]}
    />
  )
}
