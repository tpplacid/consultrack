import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminMetaClient } from './AdminMetaClient'

export default async function AdminMetaPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const { data: metaLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('source', 'meta')
    .order('created_at', { ascending: false })
    .limit(100)

  const lastSync = metaLeads?.[0]?.created_at || null

  return <AdminMetaClient admin={employee} metaLeads={metaLeads || []} lastSync={lastSync} />
}
