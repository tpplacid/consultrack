import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// POST /api/superadmin/reset-password
// Body: { employeeId: string }
// Generates a 6-digit code valid for 30 minutes.
// The employee uses it on the login page to set a new password.
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { employeeId } = await req.json()
  if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, org_id, email, role')
    .eq('id', employeeId)
    .single()

  if (empErr || !emp) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  // Only allow password reset for admin-level employees via SA panel
  // (Employee-level resets are handled by the org admin separately)

  const code = randomCode()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  // Invalidate any existing unused codes for this employee
  await supabase
    .from('password_reset_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('employee_id', employeeId)
    .is('used_at', null)

  const { error: insertErr } = await supabase
    .from('password_reset_codes')
    .insert({
      org_id: emp.org_id,
      employee_id: emp.id,
      email: emp.email,
      code,
      expires_at: expiresAt,
    })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ code, email: emp.email, expiresAt })
}
