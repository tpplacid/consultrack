import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac, timingSafeEqual } from 'crypto'

export const COOKIE_NAME = '__ct_sa'

// ── Session token ──────────────────────────────────────────────────────────
// Token = HMAC-SHA256(password, 'ct-superadmin-session') as hex.
// Stable — no timestamp parsing. Automatically invalidated when password rotates.

export function createSessionToken(password: string): string {
  return createHmac('sha256', 'ct-superadmin-session').update(password).digest('hex')
}

export function verifySessionToken(token: string | undefined, password: string): boolean {
  if (!token || !password) return false
  try {
    const expected = createHmac('sha256', 'ct-superadmin-session').update(password).digest('hex')
    const a = Buffer.from(token,    'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || a.length === 0) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function requireSuperAdmin() {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  const password = process.env.SUPERADMIN_PASSWORD
  if (!password || !verifySessionToken(token, password)) {
    redirect('/superadmin/login')
  }
}

export async function isSuperAdmin(): Promise<boolean> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  const password = process.env.SUPERADMIN_PASSWORD
  return !!password && verifySessionToken(token, password)
}
