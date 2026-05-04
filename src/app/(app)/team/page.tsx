import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { TeamClient } from './TeamClient'

export default async function TeamPage() {
  const employee = await requireRole(['tl', 'ad'])
  const supabase = await createClient()

  // For AD: show all org employees. For TL: show only direct reports.
  const { data: reports } = await supabase
    .from('employees')
    .select('*')
    .eq(employee.role === 'ad' ? 'org_id' : 'reports_to', employee.role === 'ad' ? employee.org_id : employee.id)
    .eq('is_active', true)
    .neq('id', employee.id)  // exclude self

  // Build descendants map: empId → [self, direct reports, indirect reports].
  // When AD clicks a TL row, they should see leads owned by anyone under that TL,
  // not just leads owned by the TL personally (TLs rarely own leads themselves).
  const { data: orgEmps } = await supabase
    .from('employees')
    .select('id, reports_to')
    .eq('org_id', employee.org_id)
    .eq('is_active', true)

  const childrenMap: Record<string, string[]> = {}
  for (const e of orgEmps || []) {
    if (e.reports_to) {
      if (!childrenMap[e.reports_to]) childrenMap[e.reports_to] = []
      childrenMap[e.reports_to].push(e.id)
    }
  }

  function descendantsOf(empId: string): string[] {
    const out: string[] = [empId]
    const stack = [...(childrenMap[empId] ?? [])]
    while (stack.length) {
      const id = stack.pop()!
      if (out.includes(id)) continue
      out.push(id)
      for (const c of childrenMap[id] ?? []) stack.push(c)
    }
    return out
  }
  const descendantsMap: Record<string, string[]> = {}
  for (const r of reports ?? []) {
    descendantsMap[r.id] = descendantsOf(r.id)
  }

  const reportIds = (reports || []).map(r => r.id)

  const { data: leads } = await supabase
    .from('leads')
    .select('*, owner:employees!leads_owner_id_fkey(id,name,role)')
    .in('owner_id', reportIds.length > 0 ? reportIds : ['00000000-0000-0000-0000-000000000000'])
    .order('updated_at', { ascending: false })

  return (
    <TeamClient
      manager={employee}
      reports={reports || []}
      leads={leads || []}
      descendantsMap={descendantsMap}
    />
  )
}
