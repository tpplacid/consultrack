import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminLeadsClient } from './AdminLeadsClient'
import { Employee, Lead } from '@/types'
import { unstable_cache } from 'next/cache'

const getAdminLeadsData = unstable_cache(
  async (orgId: string) => {
    const supabase = createAdminClient()
    const [{ data: leads }, { data: employees }] = await Promise.all([
      supabase
        .from('leads')
        .select('id, name, phone, source, main_stage, owner_id, updated_at, created_at, application_fees, booking_fees, tuition_fees, custom_data, owner:employees!leads_owner_id_fkey(id,name,role)')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(300),
      supabase
        .from('employees')
        .select('id, name, role')
        .eq('org_id', orgId)
        .eq('is_active', true),
    ])
    return { leads, employees }
  },
  ['admin-leads'],
  { revalidate: 60 }
)

export default async function AdminLeadsPage() {
  const employee = await requireRole(['ad'])
  const { leads, employees } = await getAdminLeadsData(employee.org_id)

  return <AdminLeadsClient admin={employee} leads={(leads || []) as unknown as Lead[]} employees={(employees || []) as unknown as Employee[]} />
}
