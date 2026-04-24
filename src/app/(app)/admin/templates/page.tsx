import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminTemplatesClient } from './AdminTemplatesClient'

export default async function AdminTemplatesPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()
  const { data: templates } = await supabase.from('wa_templates').select('*').eq('org_id', employee.org_id).order('name')
  return <AdminTemplatesClient admin={employee} templates={templates || []} />
}
