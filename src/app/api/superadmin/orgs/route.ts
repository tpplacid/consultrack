import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_STAGES, DEFAULT_ROLES, DEFAULT_FLOWS } from '@/context/orgDefaults'

export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, slug, adminOption, adminName, adminEmail, adminPassword, inviteEmail, inviteName } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Create org
  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .insert({ name, slug })
    .select()
    .single()

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 400 })
  }

  const orgId = org.id

  // 2. Seed default pipeline
  for (const s of DEFAULT_STAGES) {
    const { data: inserted } = await supabase
      .from('org_stages')
      .insert({
        org_id: orgId,
        key: s.key,
        label: s.label,
        color_bg: s.color_bg,
        color_text: s.color_text,
        position: s.position,
        sla_days: s.sla_days,
        is_won: s.is_won,
        is_lost: s.is_lost,
      })
      .select()
      .single()

    if (inserted && s.substages.length > 0) {
      await supabase.from('org_stage_substages').insert(
        s.substages.map((label, i) => ({ org_id: orgId, stage_key: s.key, label, position: i }))
      )
    }
  }

  await supabase.from('org_stage_flows').insert(
    DEFAULT_FLOWS.map(f => ({ org_id: orgId, ...f }))
  )

  // 3. Seed default roles
  for (const r of DEFAULT_ROLES) {
    await supabase.from('org_roles').insert({
      org_id: orgId,
      key: r.key,
      label: r.label,
      level: r.level,
      position: r.position,
      can_view_team: r.can_view_team,
      can_transfer_leads: r.can_transfer_leads,
      can_approve_leads: r.can_approve_leads,
      can_access_admin: r.can_access_admin,
    })
  }

  // 4. Handle admin option
  if (adminOption === 'create' && adminName && adminEmail && adminPassword) {
    // Create Supabase auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: `Org created but admin auth failed: ${authError.message}` }, { status: 207 })
    }

    // Create employee record
    await supabase.from('employees').insert({
      org_id: orgId,
      email: adminEmail,
      name: adminName,
      role: 'ad',
    })

    return NextResponse.json({ orgId, adminEmail })
  }

  if (adminOption === 'invite') {
    // Create invite token
    const { data: invite, error: inviteError } = await supabase
      .from('org_invites')
      .insert({
        org_id: orgId,
        role: 'ad',
        email: inviteEmail || null,
        name: inviteName || null,
      })
      .select()
      .single()

    if (inviteError) {
      return NextResponse.json({ error: `Org created but invite failed: ${inviteError.message}` }, { status: 207 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consultrackk.vercel.app'
    const inviteLink = `${baseUrl}/invite/${invite.token}`
    return NextResponse.json({ orgId, inviteLink })
  }

  return NextResponse.json({ orgId })
}
