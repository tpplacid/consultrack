import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await params
  const supabase  = createAdminClient()

  const { error } = await supabase
    .from('orgs')
    .update({ meta_setup_sent_at: new Date().toISOString() })
    .eq('id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
