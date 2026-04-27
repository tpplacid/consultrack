import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export const COOKIE_NAME = '__ct_sa'

// ── Session token ──────────────────────────────────────────────────────────
// Random UUID stored in superadmin_sessions table.
// Revocation is instant — logout deletes the row, so any browser holding the
// cookie will be sent to /login on next request regardless of caching behaviour.

export function createSessionToken(): string {
  return crypto.randomUUID()
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('superadmin_sessions')
      .select('token')
      .eq('token', token)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function requireSuperAdmin() {
  const jar   = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  const valid = await verifySessionToken(token)
  if (!valid) redirect('/superadmin/login')
}

export async function isSuperAdmin(): Promise<boolean> {
  const jar   = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  return verifySessionToken(token)
}
