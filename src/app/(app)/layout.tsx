import { requireAuth } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { OrgConfigProvider, OrgStage, OrgRole } from '@/context/OrgConfigContext'
import { DEFAULT_STAGES, DEFAULT_ROLES } from '@/context/orgDefaults'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireAuth()

  let stages: OrgStage[] = []
  let roles: OrgRole[] = []
  const supabase = createAdminClient()

  try {
    const [{ data: stageRows }, { data: substageRows }, { data: roleRows }] = await Promise.all([
      supabase.from('org_stages').select('*').eq('org_id', employee.org_id).order('position'),
      supabase.from('org_stage_substages').select('stage_key, label').eq('org_id', employee.org_id).order('position'),
      supabase.from('org_roles').select('*').eq('org_id', employee.org_id).order('position'),
    ])
    if (stageRows && stageRows.length > 0) {
      const subMap: Record<string, string[]> = {}
      for (const ss of substageRows || []) {
        if (!subMap[ss.stage_key]) subMap[ss.stage_key] = []
        subMap[ss.stage_key].push(ss.label)
      }
      stages = stageRows.map(s => ({ ...s, substages: subMap[s.key] ?? [] }))
    } else {
      stages = DEFAULT_STAGES.map((s, i) => ({ ...s, id: i.toString() }))
    }
    if (roleRows && roleRows.length > 0) {
      roles = roleRows as OrgRole[]
    } else {
      roles = DEFAULT_ROLES.map((r, i) => ({ ...r, id: i.toString() }))
    }
  } catch {
    stages = DEFAULT_STAGES.map((s, i) => ({ ...s, id: i.toString() }))
    roles = DEFAULT_ROLES.map((r, i) => ({ ...r, id: i.toString() }))
  }

  const stageMap = Object.fromEntries(stages.map(s => [s.key, s]))
  const roleMap = Object.fromEntries(roles.map(r => [r.key, r]))

  // Fetch org logo
  const { data: orgData } = await supabase
    .from('orgs')
    .select('logo_url, name')
    .eq('id', employee.org_id)
    .single()

  return (
    <OrgConfigProvider config={{ stages, roles, stageMap, roleMap }}>
      <AppShell employee={employee} orgLogoUrl={orgData?.logo_url ?? null} orgName={orgData?.name ?? ''}>
        {children}
      </AppShell>
    </OrgConfigProvider>
  )
}
