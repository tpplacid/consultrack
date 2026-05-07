import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildExportCsv, executeReset } from '@/lib/dataRequests'

const EXPORT_BUCKET = 'data-exports'
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60   // 7 days

// SA approves a pending data request and immediately executes the
// underlying action. We collapse approve + execute into one endpoint
// because there's no value in a deferred state — once SA says yes, run.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin()
  // SA sessions don't carry an email; we only know the actor approved.
  // Audit field captures a generic label + the timestamp.
  const saEmail = process.env.SUPERADMIN_EMAIL ?? 'superadmin'
  const { id } = await params
  const supabase = createAdminClient()

  // Load + lock-by-status. Pending only — already-approved or completed
  // requests can't be re-approved.
  const { data: request, error: loadErr } = await supabase
    .from('data_requests').select('*').eq('id', id).single()
  if (loadErr || !request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (request.status !== 'pending') {
    return NextResponse.json({
      error: `Request is ${request.status}, not pending — cannot approve`,
    }, { status: 409 })
  }

  // Mark approved (so a second click while we work returns 409 above).
  await supabase.from('data_requests').update({
    status:         'approved',
    sa_decided_by:  saEmail,
    sa_decided_at:  new Date().toISOString(),
  }).eq('id', id)

  // ── Execute ─────────────────────────────────────────────────
  try {
    if (request.request_type === 'export') {
      const csv = await buildExportCsv(supabase, request.org_id)
      // Lazy bucket create. createBucket returns an error if it already
      // exists; we only fail-out for unrelated errors.
      const { error: bucketErr } = await supabase.storage.createBucket(EXPORT_BUCKET, { public: false })
      if (bucketErr && !bucketErr.message.toLowerCase().includes('already exists')) {
        throw new Error(`bucket: ${bucketErr.message}`)
      }
      const path = `${request.org_id}/${id}.csv`
      const { error: uploadErr } = await supabase.storage
        .from(EXPORT_BUCKET)
        .upload(path, csv, { contentType: 'text/csv', upsert: true })
      if (uploadErr) throw new Error(`upload: ${uploadErr.message}`)

      const { data: signed, error: signErr } = await supabase.storage
        .from(EXPORT_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      if (signErr || !signed) throw new Error(`sign: ${signErr?.message ?? 'no url'}`)

      const expires = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString()
      await supabase.from('data_requests').update({
        status:            'completed',
        completed_at:      new Date().toISOString(),
        export_url:        signed.signedUrl,
        export_expires_at: expires,
      }).eq('id', id)

      return NextResponse.json({ ok: true, export_url: signed.signedUrl, expires_at: expires })
    }

    if (request.request_type === 'reset') {
      const res = await executeReset(supabase, request.org_id)
      if (!res.ok) throw new Error(res.error)

      await supabase.from('data_requests').update({
        status:        'completed',
        completed_at:  new Date().toISOString(),
      }).eq('id', id)

      return NextResponse.json({ ok: true, deleted: res.deleted })
    }

    throw new Error(`unknown request_type: ${request.request_type}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'execution failed'
    await supabase.from('data_requests').update({
      status:          'failed',
      failure_reason:  msg,
    }).eq('id', id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
