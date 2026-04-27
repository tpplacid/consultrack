import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/superadmin'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  // Explicitly set cookie to empty + expired with the same attributes it was
  // set with — this is the only reliable way to clear it across all browsers.
  // cookies.delete() omits path/secure/sameSite, so some browsers ignore it.
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
  return res
}
