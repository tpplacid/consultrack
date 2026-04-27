import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import OrgDetailClient from './OrgDetailClient'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ orgId: string }> }

export default async function OrgDetailPage({ params }: Props) {
  await requireSuperAdmin()
  const { orgId } = await params
  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('orgs')
    .select('id, name, slug, logo_url, features, brand_palette, meta_config, is_live, created_at')
    .eq('id', orgId)
    .single()

  if (!org) notFound()

  const [{ data: employees }, { data: invites }, { data: orgRoles }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, name, email, role, is_active, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('org_invites')
      .select('id, token, email, name, role, used_at, expires_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('org_roles')
      .select('key, label')
      .eq('org_id', orgId)
      .order('position'),
  ])

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consultrack.vercel.app'

  return (
    <OrgDetailClient
      org={org}
      employees={employees || []}
      orgRoles={orgRoles || []}
      invites={(invites || []).map(inv => ({
        ...inv,
        link: `${baseUrl}/invite/${inv.token}`,
      }))}
    />
  )
}
