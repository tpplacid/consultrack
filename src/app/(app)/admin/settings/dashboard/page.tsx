import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardSettingsClient } from './DashboardSettingsClient'
import { DashboardCard } from '@/lib/dashboardCards'
import { getRevenueFieldDefs } from '@/lib/fieldLayouts'
import { SectionLayout } from '@/lib/fieldLayouts'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  const [{ data: orgRow }, { data: stageRows }, { data: layouts }, { data: roleRows }] = await Promise.all([
    supabase.from('orgs').select('dashboard_stage_keys, dashboard_cards, dashboard_cards_configured').eq('id', employee.org_id).single(),
    supabase.from('org_stages').select('key, label, is_lost, is_won, position').eq('org_id', employee.org_id).order('position'),
    supabase.from('org_field_layouts').select('*').eq('org_id', employee.org_id).order('position'),
    supabase.from('org_roles').select('key, label').eq('org_id', employee.org_id).order('level', { ascending: false }),
  ])

  const sections      = (layouts || []) as SectionLayout[]
  const currencyDefs  = getRevenueFieldDefs(sections)
  const initialCards  = (orgRow?.dashboard_cards as DashboardCard[] | null) ?? []
  const legacyKeys    = (orgRow?.dashboard_stage_keys as string[] | null) ?? []
  const configured    = !!orgRow?.dashboard_cards_configured

  return (
    <DashboardSettingsClient
      orgId={employee.org_id}
      stages={stageRows || []}
      currencyDefs={currencyDefs}
      orgRoles={(roleRows || []) as { key: string; label: string }[]}
      initialCards={initialCards}
      legacyStageKeys={legacyKeys}
      configured={configured}
    />
  )
}
