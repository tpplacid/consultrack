import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/superadmin'

function clearCookie(res: NextResponse) {
  // Explicitly overwrite with empty value + expired date + same attributes
  // the cookie was set with. This is the only reliable cross-browser way to
  // clear an httpOnly cookie. cookies.delete() omits path/secure/sameSite so
  // strict browsers (Arc, Safari) ignore it.
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
}

// GET /api/superadmin/logout
// The nav links directly to this URL — the browser follows the redirect and
// processes the Set-Cookie header atomically. No client-side fetch race.
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const res = NextResponse.redirect(`${origin}/superadmin/login`, { status: 302 })
  clearCookie(res)
  return res
}

// POST kept for any programmatic callers
export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearCookie(res)
  return res
}
