import { NextResponse } from 'next/server'
import { getEmployee } from '@/lib/auth'
import { getQuotaState } from '@/lib/leadQuota'

// GET /api/quota — returns the caller's org quota state.
// Used by client pre-checks (BulkUploadClient, dashboard banner, etc.) so the
// UI can warn / block before attempting an insert that would be blocked
// server-side. Does NOT itself enforce — the create endpoints do that.
export async function GET() {
  const employee = await getEmployee()
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const state = await getQuotaState(employee.org_id)
  return NextResponse.json(state)
}
