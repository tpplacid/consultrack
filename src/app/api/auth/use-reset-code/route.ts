import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/auth/use-reset-code
// Body: { email: string; code: string; newPassword: string }
// No auth required — the code itself is the credential.
export async function POST(req: NextRequest) {
  const { email, code, newPassword } = await req.json()

  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'email, code, and newPassword are required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Look up a valid, unused code
  const { data: record, error: findErr } = await supabase
    .from('password_reset_codes')
    .select('id, employee_id, expires_at, used_at')
    .eq('email', email.toLowerCase())
    .eq('code', code)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (findErr || !record) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  // Find the Supabase auth user by email
  const { data: authData } = await supabase.auth.admin.listUsers()
  const user = authData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Update the password
  const { error: pwErr } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })
  if (pwErr) {
    return NextResponse.json({ error: pwErr.message }, { status: 500 })
  }

  // Mark code as used
  await supabase
    .from('password_reset_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', record.id)

  return NextResponse.json({ success: true })
}
