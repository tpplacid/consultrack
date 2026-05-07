import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import DataPrivacyClient from './DataPrivacyClient'
import type { DataRequest } from '@/lib/dataRequests'

export const dynamic = 'force-dynamic'

export default async function DataPrivacyPage() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('data_requests')
    .select('*')
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return <DataPrivacyClient initialRequests={(data ?? []) as DataRequest[]} />
}
