import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { StuckLeadsClient } from './StuckLeadsClient'
import { Lead } from '@/types'

export const revalidate = 120

export default async function StuckLeadsPage() {
  const admin = await requireRole(['ad'])
  const supabase = await createClient()

  // Warm to Hot: stuck in A or B beyond SLA (A=1d, B=5d)
  const [{ data: warmStuck }, { data: hotStuck }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, phone, source, main_stage, stage_entered_at, sla_deadline, owner_id, custom_data, owner:employees!leads_owner_id_fkey(id,name,role)')
      .eq('org_id', admin.org_id)
      .in('main_stage', ['A', 'B'])
      .lt('stage_entered_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
      .order('stage_entered_at', { ascending: true })
      .limit(500),
    supabase
      .from('leads')
      .select('id, name, phone, source, main_stage, stage_entered_at, sla_deadline, owner_id, custom_data, owner:employees!leads_owner_id_fkey(id,name,role)')
      .eq('org_id', admin.org_id)
      .eq('main_stage', 'C')
      .lt('stage_entered_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
      .order('stage_entered_at', { ascending: true })
      .limit(500),
  ])

  return <StuckLeadsClient warmStuck={(warmStuck || []) as unknown as Lead[]} hotStuck={(hotStuck || []) as unknown as Lead[]} />
}
