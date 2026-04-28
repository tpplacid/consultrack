import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getOrgFeatures } from '@/lib/orgFeatures'
import { FeatureGate } from '@/components/FeatureGate'
import { BulkUploadClient } from './BulkUploadClient'

export default async function BulkUploadPage() {
  const employee = await requireRole(['ad'])
  const features  = await getOrgFeatures(employee.org_id)

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

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', employee.org_id)
    .eq('is_active', true)

  return <BulkUploadClient admin={employee} employees={employees || []} />
}
