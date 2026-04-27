import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Superadmin cookie auth ─────────────────────────────────────────────────
// Random UUID token stored in superadmin_sessions table.
// Revocation is immediate — deleting the row invalidates the session even if
// Arc or any other browser holds onto the cookie forever.
const SA_COOKIE = '__ct_sa'
const NO_CACHE  = 'no-store, no-cache, must-revalidate'

async function isSuperAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return false
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/superadmin_sessions?token=eq.${encodeURIComponent(token)}&select=token&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        // Edge runtime — must opt out of Next.js's default cache
        cache: 'no-store',
      },
    )
    if (!res.ok) return false
    const data = await res.json()
    return Array.isArray(data) && data.length > 0
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
