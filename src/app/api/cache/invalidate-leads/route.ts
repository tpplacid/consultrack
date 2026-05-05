import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getEmployee } from '@/lib/auth'

// POST /api/cache/invalidate-leads
// Called by client mutations after they succeed (lead update, transfer,
// stage change, etc.) so the next visit to /admin/leads or /admin/analytics
// reads fresh data instead of the cached snapshot.
//
// Auth: requires a logged-in employee. We invalidate ONLY their org's tag —
// no way to bust another org's cache.
export async function POST() {
  const employee = await getEmployee()
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 'max' profile = stale-while-revalidate (Next.js 16 API). Snappier UX
  // than the deprecated single-arg form which forces a blocking refetch.
  revalidateTag(`admin-leads:${employee.org_id}`, 'max')
  revalidateTag(`analytics:${employee.org_id}`, 'max')

  return NextResponse.json({ ok: true })
}
