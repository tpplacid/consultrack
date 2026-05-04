import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminMetaClient } from './AdminMetaClient'

export default async function AdminMetaPage() {
  const employee = await requireRole(['ad'])
  const supabase = await createClient()

  const [{ data: orgData }, { data: metaLeads }] = await Promise.all([
    supabase.from('orgs').select('meta_config, meta_setup_sent_at').eq('id', employee.org_id).single(),
    supabase.from('leads').select('*').eq('source', 'meta').eq('org_id', employee.org_id).order('created_at', { ascending: false }).limit(100),
  ])

  const metaConfig  = (orgData?.meta_config ?? {}) as { page_id?: string }
  const isConnected = !!(metaConfig.page_id || (metaLeads && metaLeads.length > 0))

  return (
    <AdminMetaClient
      admin={employee}
      metaLeads={metaLeads || []}
      lastSync={metaLeads?.[0]?.created_at ?? null}
      isConnected={isConnected}
      setupSent={orgData?.meta_setup_sent_at ?? null}
      verifyToken={process.env.META_VERIFY_TOKEN ?? null}
      webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultrackk.vercel.app'}/api/meta/webhook`}
      pageId={metaConfig.page_id ?? null}
    />
  )
}
