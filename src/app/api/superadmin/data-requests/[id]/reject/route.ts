import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

// SA rejects a pending data request with an optional reason. The reason
// surfaces in the org admin's request history so they understand why
// they need to talk to support before resubmitting.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin()
  const saEmail = process.env.SUPERADMIN_EMAIL ?? 'superadmin'
  const { id } = await params
  const body = await req.json().catch(() => ({})) as { reason?: string }

  const supabase = createAdminClient()
  const { data: request } = await supabase
    .from('data_requests').select('status').eq('id', id).single()
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.status !== 'pending') {
    return NextResponse.json({
      error: `Request is ${request.status}, not pending — cannot reject`,
    }, { status: 409 })
  }

  const { error } = await supabase.from('data_requests').update({
    status:           'rejected',
    sa_decided_by:    saEmail,
    sa_decided_at:    new Date().toISOString(),
    rejection_reason: body.reason?.trim() || null,
  }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
