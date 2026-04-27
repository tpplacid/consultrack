import { NextResponse, type NextRequest } from 'next/server'

// ── Superadmin auth middleware ─────────────────────────────────────────────
//
// WHY this exists instead of server-component redirects:
// When a server component calls redirect(), Next.js builds the 307 response
// internally AFTER the middleware NextResponse.next() chain, so any headers
// set on NextResponse.next() are NOT applied to that redirect response.
// Arc (and some other browsers) cache 307 redirects that lack Cache-Control
// headers — meaning a cached /superadmin/login→/superadmin/orgs redirect
// gets replayed even after logout, making the session appear permanent.
//
// Middleware redirects ARE the response, so Cache-Control: no-store lands
// on every redirect, and Arc never caches them.

const COOKIE_NAME = '__ct_sa'

// Uses Web Crypto API (available in Edge runtime).
// Must match createSessionToken() in src/lib/superadmin.ts:
//   createHmac('sha256', 'ct-superadmin-session').update(password).digest('hex')
async function isValidToken(token: string | undefined): Promise<boolean> {
  const password = process.env.SUPERADMIN_PASSWORD
  if (!token || !password) return false
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode('ct-superadmin-session'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(password))
    const expected = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return token === expected
  } catch {
    return false
  }
}

const NO_CACHE = 'no-store, no-cache, must-revalidate'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Let login/logout API routes pass straight through ──────────────────
  // These routes manage the cookie themselves.
  if (
    pathname === '/api/superadmin/login' ||
    pathname === '/api/superadmin/logout'
  ) {
    const res = NextResponse.next()
    res.headers.set('Cache-Control', NO_CACHE)
    return res
  }

  const token  = request.cookies.get(COOKIE_NAME)?.value
  const authed = await isValidToken(token)

  const isLoginPage = pathname === '/superadmin/login'

  // ── Authenticated + on login page → redirect to dashboard ─────────────
  if (authed && isLoginPage) {
    const res = NextResponse.redirect(new URL('/superadmin/orgs', request.url))
    res.headers.set('Cache-Control', NO_CACHE)
    res.headers.set('Pragma', 'no-cache')
    return res
  }

  // ── Not authenticated + on protected page → redirect to login ─────────
  if (!authed && !isLoginPage) {
    const res = NextResponse.redirect(new URL('/superadmin/login', request.url))
    res.headers.set('Cache-Control', NO_CACHE)
    res.headers.set('Pragma', 'no-cache')
    return res
  }

  // ── Authenticated on protected page, or guest on login page → allow ───
  const res = NextResponse.next()
  res.headers.set('Cache-Control', NO_CACHE)
  res.headers.set('Pragma', 'no-cache')
  return res
}

export const config = {
  matcher: ['/superadmin/:path*', '/api/superadmin/:path*'],
}
