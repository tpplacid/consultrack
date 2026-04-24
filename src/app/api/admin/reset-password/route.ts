import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabase.from('employees').select('role').eq('email', user.email!).single()
  if (!admin || admin.role !== 'ad') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { employee_id, new_password } = await req.json()
  if (!employee_id || !new_password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (new_password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(employee_id, { password: new_password })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
