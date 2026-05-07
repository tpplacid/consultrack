import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Org admin creates an export / reset request. Action does NOT execute
// here — it queues for SA approval. SA decides via /superadmin/support
// → Data Requests tabs.

export async function POST(req: NextRequest) {
  const employee = await requireRole(['ad'])
  const body = await req.json().catch(() => ({})) as { type?: string; reason?: string }
  const type = body.type
  if (type !== 'export' && type !== 'reset') {
    return NextResponse.json({ error: 'type must be export or reset' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Block stacking: if an unresolved request of the same type already
  // exists, surface that instead of creating duplicates.
  const { data: existing } = await supabase
    .from('data_requests')
    .select('id, status, created_at')
    .eq('org_id', employee.org_id)
    .eq('request_type', type)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({
      error: `A ${type} request is already ${existing.status}. Wait for the Superadmin to act on it.`,
      existing_id: existing.id,
    }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('data_requests')
    .insert({
      org_id: employee.org_id,
      requested_by_employee_id: employee.id,
      request_type: type,
      status: 'pending',
      reason: body.reason?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}

// List the org's own requests (newest first). Org admins see only
// their own org's history.
export async function GET() {
  const employee = await requireRole(['ad'])
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('data_requests')
    .select('*')
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}
