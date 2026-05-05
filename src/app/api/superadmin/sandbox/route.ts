import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_STAGES, DEFAULT_ROLES, DEFAULT_FLOWS } from '@/context/orgDefaults'

const SANDBOX_SLUG = 'sandbox'
const SANDBOX_NAME = 'Sandbox'
const SANDBOX_ADMIN_EMAIL = 'sandbox-admin@consultrack.local'
// Random-on-creation password — never used (SA logs in via magic link)
function randPw() { return 'Sb_' + Math.random().toString(36).slice(2, 14) + 'Z!' }

// GET /api/superadmin/sandbox
// Returns the sandbox org. Auto-creates it (with default seed) if it
// doesn't exist. Then returns a magic-link URL for the SA to enter.
export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()

  // Find existing sandbox
  let { data: sandbox } = await supabase
    .from('orgs')
    .select('id, name, slug, is_sandbox')
    .eq('is_sandbox', true)
    .maybeSingle()

  // Create if missing
  if (!sandbox) {
    const { data: newOrg, error } = await supabase
      .from('orgs')
      .insert({ name: SANDBOX_NAME, slug: SANDBOX_SLUG, is_sandbox: true, is_live: true })
      .select('id, name, slug, is_sandbox')
      .single()
    if (error || !newOrg) {
      return NextResponse.json({ error: error?.message || 'Failed to create sandbox' }, { status: 500 })
    }
    sandbox = newOrg

    // Seed pipeline + roles
    for (const s of DEFAULT_STAGES) {
      await supabase.from('org_stages').insert({
        org_id: sandbox.id, key: s.key, label: s.label, color_bg: s.color_bg, color_text: s.color_text,
        position: s.position, sla_days: s.sla_days, is_won: s.is_won, is_lost: s.is_lost,
      })
      if (s.substages.length > 0) {
        await supabase.from('org_stage_substages').insert(
          s.substages.map((label, i) => ({ org_id: sandbox!.id, stage_key: s.key, label, position: i }))
        )
      }
    }
    await supabase.from('org_stage_flows').insert(DEFAULT_FLOWS.map(f => ({ org_id: sandbox!.id, ...f })))
    for (const r of DEFAULT_ROLES) {
      await supabase.from('org_roles').insert({ org_id: sandbox!.id, ...r })
    }
  }

  // Ensure sandbox admin user exists
  const { data: empExists } = await supabase
    .from('employees')
    .select('id, email')
    .eq('org_id', sandbox.id)
    .eq('role', 'ad')
    .maybeSingle()

  let adminEmail = empExists?.email
  if (!empExists) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: SANDBOX_ADMIN_EMAIL,
      password: randPw(),
      email_confirm: true,
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

    await supabase.from('employees').insert({
      org_id: sandbox.id,
      email: SANDBOX_ADMIN_EMAIL,
      name: 'Sandbox Admin',
      role: 'ad',
    })
    adminEmail = SANDBOX_ADMIN_EMAIL
  }

  // Generate magic link to grab a hashed_token; we hand-roll the URL so the
  // session is established on OUR app domain via /auth/callback (not on
  // *.supabase.co where the cookies would be useless to us).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consultrackk.vercel.app'
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail!,
    options: { redirectTo: `${baseUrl}/dashboard` },
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: linkErr?.message || 'Magic link failed' }, { status: 500 })
  }

  const finalUrl = `${baseUrl}/auth/callback?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent('/dashboard')}`

  return NextResponse.json({
    orgId: sandbox.id,
    orgName: sandbox.name,
    orgSlug: sandbox.slug,
    url: finalUrl,
  })
}
