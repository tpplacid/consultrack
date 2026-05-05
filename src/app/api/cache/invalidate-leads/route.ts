import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getEmployee } from '@/lib/auth'
import { checkAndAlertQuota } from '@/lib/leadQuota'

// POST /api/cache/invalidate-leads
// Called by client mutations after they succeed (lead update, transfer,
// create, etc.) so the next visit to /admin/leads or /admin/analytics
// reads fresh data instead of the cached snapshot.
//
// Optional body: { createdCount?: number }
//   When > 0, also runs the quota threshold check so 80%/100% alerts fire
//   for client-side lead inserts (NewLeadModal, BulkUploadClient).
//
// Auth: requires a logged-in employee. We invalidate ONLY their org's tag —
// no way to bust another org's cache.
export async function POST(req: NextRequest) {
  const employee = await getEmployee()
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 'max' profile = stale-while-revalidate (Next.js 16 API). Snappier UX
  // than the deprecated single-arg form which forces a blocking refetch.
  revalidateTag(`admin-leads:${employee.org_id}`, 'max')
  revalidateTag(`analytics:${employee.org_id}`, 'max')
  revalidateTag(`lead-count:${employee.org_id}`, 'max')

  // Best-effort: parse optional createdCount and fire quota alerts
  let createdCount = 0
  try {
    const body = await req.json().catch(() => ({}))
    createdCount = Math.max(0, Number(body?.createdCount) || 0)
  } catch {}
  if (createdCount > 0) {
    await checkAndAlertQuota(employee.org_id, createdCount)
  }

  return NextResponse.json({ ok: true })
}
