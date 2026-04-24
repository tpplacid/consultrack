import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabase.from('employees').select('role,org_id').eq('email', user.email!).single()
  if (!admin || admin.role !== 'ad') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role, reports_to, org_id } = await req.json()
  if (!name || !email || !password || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const adminClient = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Failed to create auth user' }, { status: 400 })
  }

  // Create employee row
  const { data: employee, error: empError } = await adminClient
    .from('employees')
    .insert({
      id: authData.user.id,
      org_id: org_id || admin.org_id,
      email,
      name,
      role,
      reports_to: reports_to || null,
    })
    .select()
    .single()

  if (empError) {
    // Rollback auth user
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: empError.message }, { status: 400 })
  }

  return NextResponse.json({ employee })
}
