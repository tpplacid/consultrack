import { requireAuth } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { OrgConfigProvider, OrgStage, OrgRole, OrgFeatures, DEFAULT_FEATURES } from '@/context/OrgConfigContext'
import { DEFAULT_STAGES, DEFAULT_ROLES } from '@/context/orgDefaults'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPalette, buildThemeCSS } from '@/lib/orgTheme'

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

  // Fetch org logo + features
  const { data: orgData } = await supabase
    .from('orgs')
    .select('logo_url, name, features, brand_palette')
    .eq('id', employee.org_id)
    .single()

  const raw = (orgData?.features ?? {}) as Record<string, boolean>
  const features: OrgFeatures = {
    lead_crm:    raw.lead_crm    ?? DEFAULT_FEATURES.lead_crm,
    sla:         raw.sla         ?? DEFAULT_FEATURES.sla,
    pipeline:    raw.pipeline    ?? DEFAULT_FEATURES.pipeline,
    roles:       raw.roles       ?? DEFAULT_FEATURES.roles,
    attendance:  raw.attendance  ?? DEFAULT_FEATURES.attendance,
    meta:        raw.meta        ?? DEFAULT_FEATURES.meta,
    bulk_upload: raw.bulk_upload ?? DEFAULT_FEATURES.bulk_upload,
  }

  const palette = getPalette((orgData as unknown as Record<string, string> | null)?.brand_palette)
  const themeCSS = buildThemeCSS(palette)

  return (
    <>
      {/* Inject per-org brand palette as CSS variable overrides */}
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <OrgConfigProvider config={{ stages, roles, stageMap, roleMap, features }}>
        <AppShell employee={employee} orgLogoUrl={orgData?.logo_url ?? null} orgName={orgData?.name ?? ''}>
          {children}
        </AppShell>
      </OrgConfigProvider>
    </>
  )
}
