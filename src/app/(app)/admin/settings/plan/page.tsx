import { requireRole } from '@/lib/auth'
import { getQuotaState } from '@/lib/leadQuota'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlanClient } from './PlanClient'

export const dynamic = 'force-dynamic'

export default async function PlanSettingsPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()
  const [{ data: org }, quota] = await Promise.all([
    supabase.from('orgs').select('name, slug').eq('id', employee.org_id).single(),
    getQuotaState(employee.org_id),
  ])
  return <PlanClient orgName={org?.name ?? ''} orgSlug={org?.slug ?? ''} quota={quota} />
}
