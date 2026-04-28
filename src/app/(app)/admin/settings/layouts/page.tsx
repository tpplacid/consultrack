import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { LayoutsClient } from './LayoutsClient'
import { SectionLayout } from '@/lib/fieldLayouts'

export const dynamic = 'force-dynamic'

export default async function LayoutsPage() {
  const employee = await requireRole(['ad'])
  const supabase  = createAdminClient()

  const { data } = await supabase
    .from('org_field_layouts')
    .select('*')
    .eq('org_id', employee.org_id)
    .order('position', { ascending: true })

  return <LayoutsClient initialSections={(data || []) as SectionLayout[]} />
}
