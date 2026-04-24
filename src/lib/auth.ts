import { createClient } from '@/lib/supabase/server'
import { Employee } from '@/types'
import { redirect } from 'next/navigation'

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getEmployee(): Promise<Employee | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('email', user.email!)
    .single()

  return data
}

export async function requireAuth() {
  const employee = await getEmployee()
  if (!employee) redirect('/login')
  return employee
}

export async function requireRole(roles: string[]) {
  const employee = await requireAuth()
  if (!roles.includes(employee.role)) redirect('/dashboard')
  return employee
}
