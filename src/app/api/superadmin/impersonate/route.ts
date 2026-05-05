import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const supabase = createAdminClient()

  // Find the org's admin employee
  const { data: admin, error: empErr } = await supabase
    .from('employees')
    .select('email, org_id')
    .eq('org_id', orgId)
    .eq('role', 'ad')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (empErr || !admin) {
    return NextResponse.json({ error: 'No active admin found for this org' }, { status: 404 })
  }

  // Always use the configured app URL — SA wants prod even from localhost.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consultrackk.vercel.app'

  // We don't use action_link directly — see /auth/callback for why. We only
  // need the hashed_token to feed verifyOtp() server-side on our own domain.
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: admin.email,
    options: { redirectTo: `${baseUrl}/dashboard` },
  })

  if (error || !data?.properties?.hashed_token) {
    console.error('[Impersonate] generateLink error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  // Build a URL pointing at OUR /auth/callback route. That route runs
  // verifyOtp() server-side which sets sb-* session cookies on our app
  // domain, properly OVERWRITING any existing user session in the browser.
  const url = `${baseUrl}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent('/dashboard')}`

  return NextResponse.json({ url, email: admin.email })
}
