import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgFeatures } from '@/lib/orgFeatures'
import { FeatureGate } from '@/components/FeatureGate'
import { AdminLeavesClient } from '../../leaves/AdminLeavesClient'

export default async function TeamLeavesPage() {
  const employee = await requireRole(['ad'])
  const features = await getOrgFeatures(employee.org_id)
  if (!features.attendance) {
    return <FeatureGate featureKey="attendance" featureLabel="Leave Management" description="Track employee clock-in/out, manage leave requests, and configure weekoffs for your team." />
  }
  const supabase = createAdminClient()
  const { data: orgEmps } = await supabase.from('employees').select('id').eq('org_id', employee.org_id)
  const empIds = (orgEmps || []).map(e => e.id)
  const { data: leaves } = await supabase.from('leaves').select('*, employee:employees!employee_id(id,name,role)').in('employee_id', empIds.length > 0 ? empIds : ['00000000-0000-0000-0000-000000000000']).order('created_at', { ascending: false })
  return <AdminLeavesClient admin={employee} leaves={leaves || []} />
}
