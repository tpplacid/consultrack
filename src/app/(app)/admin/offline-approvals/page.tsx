import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { OfflineApprovalsClient } from './OfflineApprovalsClient'

export default async function OfflineApprovalsPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const { data: approvals } = await supabase
    .from('offline_lead_approvals')
    .select(`
      *,
      lead:leads(id,name,phone,source,main_stage),
      submitter:employees!offline_lead_approvals_submitted_by_fkey(id,name,role)
    `)
    .order('created_at', { ascending: false })

  return <OfflineApprovalsClient admin={employee} approvals={approvals || []} />
}
