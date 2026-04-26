import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import AcceptInviteClient from './AcceptInviteClient'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ token: string }> }

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: invite } = await supabase
    .from('org_invites')
    .select('id, org_id, token, email, name, role, used_at, expires_at')
    .eq('token', token)
    .single()

  if (!invite) notFound()

  if (invite.used_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-amber-500" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Invite Already Used</h1>
          <p className="text-slate-500 text-sm">This invite link has already been accepted. Please contact your admin for a new link.</p>
        </div>
      </div>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-red-500" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Invite Expired</h1>
          <p className="text-slate-500 text-sm">This invite link has expired. Please contact your admin for a new link.</p>
        </div>
      </div>
    )
  }

  // Get org details
  const { data: org } = await supabase
    .from('orgs')
    .select('name, slug, logo_url')
    .eq('id', invite.org_id)
    .single()

  return (
    <AcceptInviteClient
      token={token}
      orgName={org?.name || 'your organisation'}
      orgSlug={org?.slug || ''}
      orgLogoUrl={org?.logo_url ?? null}
      prefillName={invite.name || ''}
      prefillEmail={invite.email || ''}
      role={invite.role}
    />
  )
}
