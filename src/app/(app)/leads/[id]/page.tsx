import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from './LeadDetailClient'
import { Employee } from '@/types'
import { SectionLayout } from '@/lib/fieldLayouts'

// Lead detail must always read fresh server state — caching would
// preserve stale unread counts across navigations (open lead, mark as
// read, navigate away, navigate back -> stale banner shows the count
// again because the cached render predates the lead_views upsert).
export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await requireAuth()
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select(`
      *,
      owner:employees!leads_owner_id_fkey(id,name,role,email),
      reporting_manager:employees!leads_reporting_manager_id_fkey(id,name,role)
    `)
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const adminSupabase = createAdminClient()
  const [{ data: activities }, { data: templates }, { data: orgEmployees }, { data: org }, { data: layouts }] = await Promise.all([
    supabase
      .from('activities')
      .select('*, employee:employees(id,name,role)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('wa_templates')
      .select('*')
      .eq('org_id', lead.org_id)
      .eq('is_active', true),
    supabase
      .from('employees')
      .select('id, name, role, reports_to, org_id, email, is_active')
      .eq('org_id', lead.org_id)
      .eq('is_active', true)
      .limit(100),
    supabase
      .from('orgs')
      .select('sla_config, sla_config_by_source')
      .eq('id', lead.org_id)
      .single(),
    adminSupabase
      .from('org_field_layouts')
      .select('*')
      .eq('org_id', lead.org_id)
      .order('position', { ascending: true }),
  ])

  const slaConfig         = (org?.sla_config as Record<string, number> | null) || { A: 1, B: 5, C: 5, D: 20 }
  const slaConfigBySource = (org?.sla_config_by_source as Record<string, Record<string, number>> | null) || {}

  // Compute unread DM count since this employee last viewed the lead.
  // First-ever view treats lead.created_at as the cutoff so the banner
  // shows on initial open (every existing DM is "new"). Mark-as-viewed
  // happens client-side after mount so we don't reset the count before
  // the banner has a chance to render.
  const { data: viewRow } = await supabase.from('lead_views')
    .select('viewed_at').eq('employee_id', employee.id).eq('lead_id', id).maybeSingle()
  const lastViewedAt = (viewRow?.viewed_at as string | undefined) ?? null
  const unreadDmCount = (activities ?? [])
    .filter(a => a.activity_type === 'ig_dm_received' &&
                 (!lastViewedAt || a.created_at > lastViewedAt))
    .length

  return (
    <LeadDetailClient
      lead={lead}
      activities={activities || []}
      templates={templates || []}
      employee={employee}
      orgEmployees={(orgEmployees || []) as unknown as Employee[]}
      slaConfig={slaConfig}
      slaConfigBySource={slaConfigBySource}
      sections={(layouts || []) as SectionLayout[]}
      unreadDmCount={unreadDmCount}
    />
  )
}
