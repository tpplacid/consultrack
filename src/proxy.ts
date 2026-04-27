import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Superadmin cookie auth ─────────────────────────────────────────────────
// Uses Web Crypto API (Edge-runtime safe). Must match createSessionToken()
// in src/lib/superadmin.ts: HMAC-SHA256(key='ct-superadmin-session', data=password)
const SA_COOKIE = '__ct_sa'
const NO_CACHE  = 'no-store, no-cache, must-revalidate'

async function isSuperAdminToken(token: string | undefined): Promise<boolean> {
  const password = process.env.SUPERADMIN_PASSWORD
  if (!token || !password) return false
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode('ct-superadmin-session'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(password))
    const expected = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    return token === expected
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Superadmin routes ────────────────────────────────────────────────────
  // Handle auth redirects HERE so Cache-Control: no-store lands on the
  // redirect itself. When server components call redirect(), Next.js builds
  // that response after proxy() returns, so headers set on NextResponse.next()
  // never reach those redirects — Arc caches them and replays them after logout.
  if (pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin')) {
    // Let the login + logout API through — they manage the cookie themselves
    const isLoginApi  = pathname === '/api/superadmin/login'
    const isLogoutApi = pathname === '/api/superadmin/logout'

    if (!isLoginApi && !isLogoutApi) {
      const token  = request.cookies.get(SA_COOKIE)?.value
      const authed = await isSuperAdminToken(token)
      const isLoginPage = pathname === '/superadmin/login'

      if (authed && isLoginPage) {
        // Already logged in — redirect away from login page
        const res = NextResponse.redirect(new URL('/superadmin/orgs', request.url))
        res.headers.set('Cache-Control', NO_CACHE)
        res.headers.set('Pragma', 'no-cache')
        return res
      }

      if (!authed && !isLoginPage) {
        // Not authenticated — send to login
        const res = NextResponse.redirect(new URL('/superadmin/login', request.url))
        res.headers.set('Cache-Control', NO_CACHE)
        res.headers.set('Pragma', 'no-cache')
        return res
      }
    }

    // Authenticated on protected page, or guest on login page — pass through
    const res = NextResponse.next()
    res.headers.set('Cache-Control', NO_CACHE)
    res.headers.set('Pragma', 'no-cache')
    return res
  }

  // ── All other routes: refresh Supabase session cookie ───────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session cookie if needed — auth protection is handled
  // server-side via requireAuth() / requireRole() in each layout/page.
  const { data: { user } } = await supabase.auth.getUser()

  // Only redirect logged-in users away from /login to avoid a loop
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
