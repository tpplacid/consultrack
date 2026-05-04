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

  // Always use the configured app URL for impersonation — SA wants prod even when
  // hitting the route from localhost. NEXT_PUBLIC_APP_URL must be set in Vercel.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consultrackk.vercel.app'
  const redirectTo = `${baseUrl}/dashboard`

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: admin.email,
    options: { redirectTo },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[Impersonate] generateLink error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  // Defensive: Supabase bakes the project Site URL into the action_link. If it's
  // misconfigured to localhost, force-rewrite the redirect_to query param so at
  // least the post-verify hop lands on prod. (Final fix is in Supabase Dashboard
  // → Authentication → URL Configuration → Site URL + Redirect URLs allowlist.)
  let finalUrl = data.properties.action_link
  try {
    const u = new URL(finalUrl)
    u.searchParams.set('redirect_to', redirectTo)
    finalUrl = u.toString()
  } catch {}

  return NextResponse.json({ url: finalUrl, email: admin.email })
}
