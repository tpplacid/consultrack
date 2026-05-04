import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId, email, name, role } = await req.json()

  if (!orgId || !role) {
    return NextResponse.json({ error: 'orgId and role are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: inv, error } = await supabase
    .from('org_invites')
    .insert({
      org_id: orgId,
      role,
      email: email || null,
      name: name || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://consultrackk.vercel.app'
  const invite = { ...inv, link: `${baseUrl}/invite/${inv.token}` }

  return NextResponse.json({ invite })
}
