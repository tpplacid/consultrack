import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'
import { leadRevenue } from '@/lib/utils'
import { getRevenueFieldKeys, SectionLayout } from '@/lib/fieldLayouts'

export default async function DashboardPage() {
  const employee = await requireAuth()
  const supabase = await createClient()

  // Fetch leads based on role
  let query = supabase
    .from('leads')
    .select('*, owner:employees!leads_owner_id_fkey(id,name,role), reporting_manager:employees!leads_reporting_manager_id_fkey(id,name)')
    .order('updated_at', { ascending: false })

  if (employee.role === 'ad') {
    // AD sees all
  } else if (employee.role === 'tl') {
    query = query.or(`owner_id.eq.${employee.id},reporting_manager_id.eq.${employee.id}`)
  } else {
    query = query.eq('owner_id', employee.id)
  }

  const [{ data: leads }, { data: approvals }, { data: orgRow }, { data: sections }] = await Promise.all([
    query.limit(200),
    supabase
      .from('offline_lead_approvals')
      .select('lead_id, status')
      .eq('submitted_by', employee.id),
    supabase
      .from('orgs')
      .select('dashboard_stage_keys')
      .eq('id', employee.org_id)
      .single(),
    supabase
      .from('org_field_layouts')
      .select('*')
      .eq('org_id', employee.org_id)
      .order('position', { ascending: true }),
  ])

  const dashboardStageKeys = (orgRow?.dashboard_stage_keys as string[] | null) ?? ['C', 'B', 'F']
  const revenueKeys = getRevenueFieldKeys((sections || []) as SectionLayout[])

  // Map lead_id → approval status for offline/referral leads
  const approvalMap: Record<string, string> = {}
  for (const a of approvals || []) approvalMap[a.lead_id] = a.status

  // Stats: exclude rejected offline leads
  const visibleLeads = (leads || []).filter(l =>
    l.source === 'meta' || l.approved || approvalMap[l.id] !== 'rejected'
  )

  // Compute counts for the org-configured stage keys
  const stageCounts: Record<string, number> = {}
  for (const k of dashboardStageKeys) {
    stageCounts[k] = visibleLeads.filter(l => l.main_stage === k).length
  }

  const stats = {
    total: visibleLeads.length,
    stageCounts,
    totalPayments: visibleLeads.reduce((sum, l) => sum + leadRevenue(l, revenueKeys), 0),
  }

  return (
    <DashboardClient
      employee={employee}
      leads={leads || []}
      approvalMap={approvalMap}
      stats={stats}
      dashboardStageKeys={dashboardStageKeys}
    />
  )
}
