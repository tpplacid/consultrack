import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PipelineClient } from './PipelineClient'
import { DEFAULT_STAGES, DEFAULT_FLOWS } from '@/context/orgDefaults'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()
  const orgId = employee.org_id

  // Fetch stages (two queries — no FK between substages and stages)
  let { data: stageRows } = await supabase
    .from('org_stages')
    .select('*')
    .eq('org_id', orgId)
    .order('position')

  if (!stageRows || stageRows.length === 0) {
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
    await supabase.from('org_stage_flows').insert(
      DEFAULT_FLOWS.map(f => ({ org_id: orgId, ...f }))
    )
    const { data: fresh } = await supabase
      .from('org_stages').select('*').eq('org_id', orgId).order('position')
    stageRows = fresh
  }

  // Fetch substages separately
  const { data: substageRows } = await supabase
    .from('org_stage_substages')
    .select('id, stage_key, label, position')
    .eq('org_id', orgId)
    .order('position')

  const substagesByKey: Record<string, { id: string; label: string; position: number }[]> = {}
  for (const ss of substageRows || []) {
    if (!substagesByKey[ss.stage_key]) substagesByKey[ss.stage_key] = []
    substagesByKey[ss.stage_key].push({ id: ss.id, label: ss.label, position: ss.position })
  }

  const stages = (stageRows || []).map(s => ({
    ...s,
    substages: substagesByKey[s.key] || [],
  }))

  const { data: flows } = await supabase
    .from('org_stage_flows')
    .select('from_stage, to_stage')
    .eq('org_id', orgId)

  return <PipelineClient orgId={orgId} initialStages={stages} initialFlows={flows || []} />
}
