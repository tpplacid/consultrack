import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgFeatures } from '@/lib/orgFeatures'
import { FeatureGate } from '@/components/FeatureGate'
import { BulkUploadClient } from '../../bulk-upload/BulkUploadClient'
import { DEFAULT_LEAD_SOURCES } from '@/context/OrgConfigContext'

export default async function SettingsBulkUploadPage() {
  const employee = await requireRole(['ad'])
  const features = await getOrgFeatures(employee.org_id)

  if (!features.bulk_upload) {
    return (
      <FeatureGate
        featureKey="bulk_upload"
        featureLabel="Bulk CSV Upload"
        description="Import hundreds of leads at once from a CSV file — map columns, validate data, and push them straight into your pipeline. Upgrade to enable bulk upload."
      />
    )
  }

  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const [{ data: employees }, { data: orgData }] = await Promise.all([
    supabase.from('employees').select('*').eq('org_id', employee.org_id).eq('is_active', true),
    adminSupabase.from('orgs').select('lead_sources').eq('id', employee.org_id).single(),
  ])

  const leadSources = (orgData?.lead_sources ?? DEFAULT_LEAD_SOURCES) as typeof DEFAULT_LEAD_SOURCES

  return <BulkUploadClient admin={employee} employees={employees || []} leadSources={leadSources} />
}
