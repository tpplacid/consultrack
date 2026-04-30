import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSlaClient } from './AdminSlaClient'

export default async function AdminSlaPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  // Fetch breaches and employees in parallel (no FK joins)
  const [{ data: rawBreaches }, { data: allEmployees }] = await Promise.all([
    supabase.from('sla_breaches').select('*').eq('org_id', employee.org_id)
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('employees').select('id, name, role').eq('org_id', employee.org_id),
  ])

  const employeeMap: Record<string, { id: string; name: string; role: string }> =
    Object.fromEntries((allEmployees || []).map(e => [e.id, e]))

  // Fetch leads for these breaches
  const leadIds = [...new Set((rawBreaches || []).map((b: Record<string, unknown>) => b.lead_id as string).filter(Boolean))]
  const { data: leadsData } = leadIds.length
    ? await supabase.from('leads').select('id, name, phone, main_stage, owner_id').in('id', leadIds)
    : { data: [] }

  const leadMap: Record<string, { id: string; name: string; phone: string; main_stage: string; owner_id: string | null }> =
    Object.fromEntries((leadsData || []).map((l: Record<string, unknown>) => [l.id as string, l as never]))

  const enriched = (rawBreaches || []).map((b: Record<string, unknown>) => {
    const lead = leadMap[b.lead_id as string]
    return {
      ...b,
      _lead: lead ?? null,
      breach_owner_name: employeeMap[b.owner_id as string]?.name ?? '—',
      current_owner_name: lead?.owner_id ? (employeeMap[lead.owner_id]?.name ?? '—') : '—',
    }
  })

  return <AdminSlaClient admin={employee} breaches={enriched as never} />
}
