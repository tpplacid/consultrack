import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrgsPageClient } from './OrgsPageClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminOrgsPage() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const { data: orgsRaw } = await supabase
    .from('orgs')
    .select('*')
    .order('created_at', { ascending: false })

  const orgs = orgsRaw || []
  const orgIds = orgs.map(o => o.id)

  const counts: Record<string, number> = {}
  if (orgIds.length > 0) {
    const { data: empData } = await supabase
      .from('employees')
      .select('org_id')
      .in('org_id', orgIds)
    for (const e of empData || []) {
      counts[e.org_id] = (counts[e.org_id] || 0) + 1
    }
  }

  return <OrgsPageClient orgs={orgs} counts={counts} />
}
