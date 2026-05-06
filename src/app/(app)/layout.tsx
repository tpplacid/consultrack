import { requireAuth } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { OrgConfigProvider, OrgStage, OrgRole, OrgFeatures, DEFAULT_FEATURES, DEFAULT_LEAD_SOURCES } from '@/context/OrgConfigContext'
import { DEFAULT_STAGES, DEFAULT_ROLES } from '@/context/orgDefaults'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPalette, buildThemeCSS } from '@/lib/orgTheme'
import { getQuotaState } from '@/lib/leadQuota'
import { QuotaBanner } from '@/components/QuotaBanner'

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
      stages = stageRows.map(s => ({ ...s, substages: subMap[s.key] ?? [], required_fields: (s.required_fields as string[] | null) ?? [] }))
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
    .select('logo_url, name, features, brand_palette, lead_sources')
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
    instagram:   raw.instagram   ?? DEFAULT_FEATURES.instagram,
    bulk_upload: raw.bulk_upload ?? DEFAULT_FEATURES.bulk_upload,
  }

  const rawSources = (orgData?.lead_sources ?? null) as { key: string; label: string; sla_excluded: boolean }[] | null
  const leadSources = rawSources && rawSources.length > 0 ? rawSources : DEFAULT_LEAD_SOURCES

  const palette = getPalette((orgData as unknown as Record<string, string> | null)?.brand_palette)
  const themeCSS = buildThemeCSS(palette)

  // Pull quota state — banner shows for ≥80% (warning) and 100% (block).
  // Cheap: count is cached for 60s, busted on every lead create.
  const quota = await getQuotaState(employee.org_id)

  return (
    <>
      {/* Inject per-org brand palette as CSS variable overrides */}
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <OrgConfigProvider config={{ stages, roles, stageMap, roleMap, features, leadSources }}>
        <AppShell employee={employee} orgLogoUrl={orgData?.logo_url ?? null} orgName={orgData?.name ?? ''}>
          <QuotaBanner quota={quota} />
          {children}
        </AppShell>
      </OrgConfigProvider>
    </>
  )
}
