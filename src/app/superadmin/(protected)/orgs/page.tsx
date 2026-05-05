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

  const counts:     Record<string, number> = {}
  const leadCounts: Record<string, number> = {}

  if (orgIds.length > 0) {
    const [{ data: empData }, { data: leadData }] = await Promise.all([
      supabase.from('employees').select('org_id').in('org_id', orgIds),
      // Pull just lead counts per org via group-by-in-app — we keep the join
      // light by selecting only org_id. For thousands of leads this is still
      // a small payload (single id column).
      supabase.from('leads').select('org_id').in('org_id', orgIds),
    ])
    for (const e of empData || [])  counts[e.org_id]     = (counts[e.org_id] || 0) + 1
    for (const l of leadData || []) leadCounts[l.org_id] = (leadCounts[l.org_id] || 0) + 1
  }

  return <OrgsPageClient orgs={orgs} counts={counts} leadCounts={leadCounts} />
}
