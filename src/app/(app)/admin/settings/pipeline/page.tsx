import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PipelineClient } from './PipelineClient'
import { DEFAULT_STAGES, DEFAULT_FLOWS } from '@/context/orgDefaults'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()
  const orgId = employee.org_id

  // Fetch or seed stages
  let { data: stages } = await supabase
    .from('org_stages')
    .select('*, substages:org_stage_substages(id,label,position)')
    .eq('org_id', orgId)
    .order('position')

  if (!stages || stages.length === 0) {
    // Seed defaults
    for (const s of DEFAULT_STAGES) {
      const { data: inserted } = await supabase.from('org_stages').insert({
        org_id: orgId, key: s.key, label: s.label,
        color_bg: s.color_bg, color_text: s.color_text,
        position: s.position, sla_days: s.sla_days,
        is_won: s.is_won, is_lost: s.is_lost,
      }).select().single()
      if (inserted && s.substages.length > 0) {
        await supabase.from('org_stage_substages').insert(
          s.substages.map((label, i) => ({ org_id: orgId, stage_key: s.key, label, position: i }))
        )
      }
    }
    // Seed flows
    await supabase.from('org_stage_flows').insert(
      DEFAULT_FLOWS.map(f => ({ org_id: orgId, ...f }))
    )
    const { data: fresh } = await supabase
      .from('org_stages')
      .select('*, substages:org_stage_substages(id,label,position)')
      .eq('org_id', orgId)
      .order('position')
    stages = fresh
  }

  const { data: flows } = await supabase
    .from('org_stage_flows')
    .select('from_stage, to_stage')
    .eq('org_id', orgId)

  return <PipelineClient orgId={orgId} initialStages={stages || []} initialFlows={flows || []} />
}
