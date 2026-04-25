import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = await requireRole(['ad'])
  const { require_attendance_key } = await req.json()

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orgs')
    .update({ require_attendance_key })
    .eq('id', admin.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
