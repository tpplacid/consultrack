import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getOrgFeatures } from '@/lib/orgFeatures'
import { FeatureGate } from '@/components/FeatureGate'
import { AdminInstagramClient } from '../../instagram/AdminInstagramClient'

export const dynamic = 'force-dynamic'

const IG_SOURCES = ['instagram', 'instagram_dm', 'instagram_comment', 'instagram_mention']

export default async function SettingsInstagramPage() {
  const employee = await requireRole(['ad'])
  const features = await getOrgFeatures(employee.org_id)

  if (!features.instagram) {
    return (
      <FeatureGate
        featureKey="instagram"
        featureLabel="Instagram Lead Integration"
        description="Automatically pull leads from Instagram Lead Ads, DMs, Comments, and Mentions — fully bifurcated from Facebook."
      />
    )
  }

  const supabase = await createClient()

  const [{ data: orgData }, { data: igLeads }] = await Promise.all([
    supabase.from('orgs').select('instagram_config, instagram_setup_sent_at').eq('id', employee.org_id).single(),
    supabase.from('leads').select('*')
      .eq('org_id', employee.org_id)
      .in('source', IG_SOURCES)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const igConfig = (orgData?.instagram_config ?? {}) as {
    ig_account_id?: string
    capi_dataset_id?: string
    signals?: { dms_enabled?: boolean; comments_enabled?: boolean; comments_keywords?: string[]; mentions_enabled?: boolean }
  }
  const isConnected    = !!(igConfig.ig_account_id || (igLeads && igLeads.length > 0))
  const hasCapiDataset = !!(igConfig.capi_dataset_id || process.env.INSTAGRAM_CAPI_DATASET_ID)

  return (
    <AdminInstagramClient
      admin={employee}
      igLeads={igLeads || []}
      lastSync={igLeads?.[0]?.created_at ?? null}
      isConnected={isConnected}
      setupSent={orgData?.instagram_setup_sent_at ?? null}
      verifyToken={process.env.META_VERIFY_TOKEN ?? null}
      webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultrackk.vercel.app'}/api/meta/webhook`}
      igAccountId={igConfig.ig_account_id ?? null}
      hasCapiDataset={hasCapiDataset}
      signalConfig={igConfig.signals ?? {}}
    />
  )
}
