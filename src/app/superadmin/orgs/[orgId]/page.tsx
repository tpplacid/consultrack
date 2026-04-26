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
    .select('id, name, slug, logo_url, features, created_at')
    .eq('id', orgId)
    .single()

  if (!org) notFound()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, email, role, is_active, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  const { data: invites } = await supabase
    .from('org_invites')
    .select('id, token, email, name, role, used_at, expires_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consultrack.vercel.app'

  return (
    <OrgDetailClient
      org={org}
      employees={employees || []}
      invites={(invites || []).map(inv => ({
        ...inv,
        link: `${baseUrl}/invite/${inv.token}`,
      }))}
    />
  )
}
