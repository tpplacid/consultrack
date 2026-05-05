import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// /auth/callback?token_hash=...&type=magiclink&next=/dashboard
//
// Why this route exists:
// supabase.auth.admin.generateLink() returns an action_link that points to
// Supabase's hosted /auth/v1/verify endpoint. When the user clicks it,
// Supabase sets session cookies on its OWN domain (<project>.supabase.co)
// and then redirects to redirect_to. The browser arrives at our app with
// no fresh session cookies, so the dashboard either reads stale cookies of
// a previously-logged-in user OR redirects to /login.
//
// Instead of using the action_link directly, the impersonate / sandbox
// routes now build a URL that points HERE with the hashed_token. We call
// verifyOtp() server-side, which uses the SSR cookies adapter to set
// session cookies on our app domain — properly overwriting any existing
// session. Then we redirect to `next` (typically /dashboard) and the
// dashboard sees the correct user.
export async function GET(req: NextRequest) {
  const url       = new URL(req.url)
  const tokenHash = url.searchParams.get('token_hash')
  const typeParam = url.searchParams.get('type') || 'magiclink'
  const next      = url.searchParams.get('next') || '/dashboard'

  if (!tokenHash) {
    return NextResponse.redirect(new URL('/login?error=missing_token', url.origin))
  }

  // Restrict to recognised OTP types (TS narrowing for verifyOtp)
  type OtpType = 'magiclink' | 'recovery' | 'invite' | 'email_change'
  const allowedTypes: OtpType[] = ['magiclink', 'recovery', 'invite', 'email_change']
  if (!allowedTypes.includes(typeParam as OtpType)) {
    return NextResponse.redirect(new URL('/login?error=invalid_type', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    type: typeParam as OtpType,
    token_hash: tokenHash,
  })

  if (error) {
    console.error('[auth/callback] verifyOtp error:', error.message)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    )
  }

  // Session cookies are now set on our domain. Safe to send the user on.
  // Use absolute URL so the redirect can never accidentally point off-domain.
  return NextResponse.redirect(new URL(next, url.origin))
}
