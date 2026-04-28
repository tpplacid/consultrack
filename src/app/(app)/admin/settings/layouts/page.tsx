import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { LayoutsClient } from './LayoutsClient'
import { SectionLayout, STANDARD_SECTIONS } from '@/lib/fieldLayouts'

export const dynamic = 'force-dynamic'

export default async function LayoutsPage() {
  const employee = await requireRole(['ad'])
  const supabase  = createAdminClient()

  const { data } = await supabase
    .from('org_field_layouts')
    .select('*')
    .eq('org_id', employee.org_id)
    .order('position', { ascending: true })

  let sections = (data || []) as SectionLayout[]

  // Auto-seed the standard layout for orgs that have never configured custom fields.
  // This surfaces the existing hardcoded fields (lead_type, location, etc.) in the
  // Lead Fields settings tab so admins can see and manage them immediately.
  if (sections.length === 0) {
    const inserted: SectionLayout[] = []
    for (const s of STANDARD_SECTIONS) {
      const fields = s.fields.map(f => ({ ...f, id: crypto.randomUUID() }))
      const { data: row, error } = await supabase
        .from('org_field_layouts')
        .insert({
          org_id: employee.org_id,
          section_name: s.section_name,
          position: s.position,
          fields,
        })
        .select()
        .single()
      if (!error && row) inserted.push(row as SectionLayout)
    }
    sections = inserted
  }

  return <LayoutsClient initialSections={sections} />
}
