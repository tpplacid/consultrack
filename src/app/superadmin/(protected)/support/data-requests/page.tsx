import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import DataRequestsClient from './DataRequestsClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminDataRequestsPage() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  // Pull every request with org + requester resolved so the SA UI can
  // show "<Org Name> · <Employee Name>" without further joins client-side.
  const { data, error } = await supabase
    .from('data_requests')
    .select(`
      *,
      org:orgs(id, name, slug),
      requester:employees!data_requests_requested_by_employee_id_fkey(id, name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return <div className="p-8 text-sm text-red-400">Failed to load: {error.message}</div>
  }

  return <DataRequestsClient initialRequests={data ?? []} />
}
