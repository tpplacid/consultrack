import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSlaClient } from './AdminSlaClient'

export default async function AdminSlaPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  const [{ data: breaches }, { data: employees }] = await Promise.all([
    supabase
      .from('sla_breaches')
      .select(`*, lead:leads(id,name,phone,main_stage)`)
      .eq('org_id', employee.org_id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('employees')
      .select('id, name, role')
      .eq('org_id', employee.org_id),
  ])

  // Build employee lookup map
  const employeeMap: Record<string, { id: string; name: string; role: string }> =
    Object.fromEntries((employees || []).map(e => [e.id, e]))

  // Attach owner names directly so the client doesn't need FK joins
  const enriched = (breaches || []).map(b => ({
    ...b,
    breach_owner_name: employeeMap[b.owner_id]?.name ?? '—',
    lead_owner_name:   (b.lead as { owner_id?: string } | null)
      ? null  // leads.owner_id not in select, resolved separately
      : null,
  }))

  // For current owner we need lead.owner_id — re-fetch with that column
  const leadIds = (breaches || []).map(b => b.lead_id).filter(Boolean)
  const { data: leadOwners } = leadIds.length
    ? await supabase
        .from('leads')
        .select('id, owner_id')
        .in('id', leadIds)
    : { data: [] }

  const leadOwnerMap: Record<string, string> =
    Object.fromEntries((leadOwners || []).map(l => [l.id, employeeMap[l.owner_id]?.name ?? '—']))

  const enrichedFinal = enriched.map(b => ({
    ...b,
    breach_owner_name: employeeMap[b.owner_id]?.name ?? '—',
    current_owner_name: leadOwnerMap[b.lead_id] ?? '—',
  }))

  return <AdminSlaClient admin={employee} breaches={enrichedFinal} />
}
