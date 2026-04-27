// GET /api/superadmin/logout
//
// 1. Reads the session cookie.
// 2. Deletes the token from superadmin_sessions (server-side revocation).
// 3. Clears the cookie.
// 4. Redirects to /superadmin/login.
//
// Because the row is deleted, any browser that holds onto the cookie (e.g. Arc)
// will be refused by the proxy on the next protected request — no race condition.

import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value

  // Revoke server-side — this is what makes logout actually work
  if (token) {
    try {
      const supabase = createAdminClient()
      await supabase.from('superadmin_sessions').delete().eq('token', token)
    } catch {
      // Non-fatal — proceed with redirect regardless
    }
  }

  const res = NextResponse.redirect(new URL('/superadmin/login', req.url))
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.headers.set('Pragma', 'no-cache')
  return res
}

// POST kept for any programmatic callers
export async function POST(req: NextRequest) {
  return GET(req)
}
