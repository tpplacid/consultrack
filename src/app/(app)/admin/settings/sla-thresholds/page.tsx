import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgFeatures } from '@/lib/orgFeatures'
import { FeatureGate } from '@/components/FeatureGate'
import { SlaThresholdsClient } from './SlaThresholdsClient'

export default async function SlaThresholdsPage() {
  const employee = await requireRole(['ad'])
  const features = await getOrgFeatures(employee.org_id)

  if (!features.sla) {
    return (
      <FeatureGate
        featureKey="sla"
        featureLabel="Deadline Rules"
        description="Set custom deadline windows per pipeline stage so your team never misses a follow-up. SLA breach tracking keeps everyone accountable. Upgrade to configure deadline rules."
      />
    )
  }

  const supabase = createAdminClient()
  const { data: org } = await supabase.from('orgs').select('id, sla_config, sla_config_by_source').eq('id', employee.org_id).single()
  const slaConfig         = (org?.sla_config as Record<string, number> | null) || { A: 1, B: 5, C: 5, D: 20 }
  const slaConfigBySource = (org?.sla_config_by_source as Record<string, Record<string, number>> | null) || {}
  return <SlaThresholdsClient orgId={employee.org_id} slaConfig={slaConfig} slaConfigBySource={slaConfigBySource} />
}
