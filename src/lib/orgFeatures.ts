import { createAdminClient } from '@/lib/supabase/admin'
import { OrgFeatures, DEFAULT_FEATURES } from '@/context/OrgConfigContext'

/** Fetch feature flags for an org. Defaults everything to true if not set. */
export async function getOrgFeatures(orgId: string): Promise<OrgFeatures> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('orgs').select('features').eq('id', orgId).single()
  const raw = (data?.features ?? {}) as Record<string, boolean>
  return {
    lead_crm:    raw.lead_crm    ?? DEFAULT_FEATURES.lead_crm,
    sla:         raw.sla         ?? DEFAULT_FEATURES.sla,
    pipeline:    raw.pipeline    ?? DEFAULT_FEATURES.pipeline,
    roles:       raw.roles       ?? DEFAULT_FEATURES.roles,
    attendance:  raw.attendance  ?? DEFAULT_FEATURES.attendance,
    meta:        raw.meta        ?? DEFAULT_FEATURES.meta,
    instagram:   raw.instagram   ?? DEFAULT_FEATURES.instagram,
    bulk_upload: raw.bulk_upload ?? DEFAULT_FEATURES.bulk_upload,
  }
}
