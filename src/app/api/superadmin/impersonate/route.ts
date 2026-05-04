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

  // Generate a magic link for that admin — when opened, logs them in and redirects to dashboard.
  // Use the request origin so SA on prod links to prod, SA on localhost links to localhost.
  // Falls back to env var, then to prod URL.
  const baseUrl =
    req.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://consultrackk.vercel.app'
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: admin.email,
    options: { redirectTo: `${baseUrl}/dashboard` },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[Impersonate] generateLink error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  return NextResponse.json({ url: data.properties.action_link, email: admin.email })
}
