import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { SourcesClient } from './SourcesClient'
import { DEFAULT_LEAD_SOURCES } from '@/context/OrgConfigContext'

export const dynamic = 'force-dynamic'

export default async function SourcesPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  const { data: orgData } = await supabase
    .from('orgs')
    .select('lead_sources')
    .eq('id', employee.org_id)
    .single()

  const sources = (orgData?.lead_sources ?? DEFAULT_LEAD_SOURCES) as typeof DEFAULT_LEAD_SOURCES

  return <SourcesClient orgId={employee.org_id} initialSources={sources} />
}
