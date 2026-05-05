import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminLeadsClient } from './AdminLeadsClient'
import { Employee, Lead } from '@/types'
import { SectionLayout } from '@/lib/fieldLayouts'
import { unstable_cache } from 'next/cache'

// Cache is keyed AND tagged per-org so revalidateTag('admin-leads:<orgId>')
// from a mutation invalidates only that org's cache, never another org's.
function adminLeadsLoader(orgId: string) {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const [{ data: leads }, { data: employees }, { data: sections }] = await Promise.all([
        // Revenue lives in custom_data since migration 011 — no fee columns selected
        supabase
          .from('leads')
          .select('id, name, phone, source, main_stage, owner_id, updated_at, created_at, custom_data, owner:employees!leads_owner_id_fkey(id,name,role)')
          .eq('org_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(300),
        supabase
          .from('employees')
          .select('id, name, role')
          .eq('org_id', orgId)
          .eq('is_active', true),
        supabase
          .from('org_field_layouts')
          .select('*')
          .eq('org_id', orgId)
          .order('position', { ascending: true }),
      ])
      return { leads, employees, sections }
    },
    ['admin-leads', orgId],
    { revalidate: 60, tags: [`admin-leads:${orgId}`] },
  )()
}

export default async function AdminLeadsPage() {
  const employee = await requireRole(['ad'])
  const { leads, employees, sections } = await adminLeadsLoader(employee.org_id)

  return (
    <AdminLeadsClient
      admin={employee}
      leads={(leads || []) as unknown as Lead[]}
      employees={(employees || []) as unknown as Employee[]}
      sections={(sections || []) as SectionLayout[]}
    />
  )
}
