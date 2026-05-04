import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardSettingsClient } from './DashboardSettingsClient'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  const [{ data: orgRow }, { data: stageRows }] = await Promise.all([
    supabase.from('orgs').select('dashboard_stage_keys').eq('id', employee.org_id).single(),
    supabase.from('org_stages').select('key, label, is_lost, is_won, position').eq('org_id', employee.org_id).order('position'),
  ])

  return (
    <DashboardSettingsClient
      orgId={employee.org_id}
      stages={stageRows || []}
      initialKeys={(orgRow?.dashboard_stage_keys as string[] | null) ?? ['C', 'B', 'F']}
    />
  )
}
