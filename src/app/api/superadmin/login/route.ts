import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, createSessionToken } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

// ── In-memory rate limiter ─────────────────────────────────────────────────
// Max 5 failed attempts per IP in a 15-minute window.
// Resets on deploy (serverless cold starts) which is fine for basic brute-force
// protection — proper production deployments should use Redis/Upstash.
const WINDOW_MS  = 15 * 60 * 1000 // 15 min
const MAX_FAILS  = 5

const attempts = new Map<string, { count: number; resetAt: number }>()

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  const record = attempts.get(ip)

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_FAILS, retryAfterSec: 0 }
  }

  if (record.count >= MAX_FAILS) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((record.resetAt - now) / 1000) }
  }

  return { allowed: true, remaining: MAX_FAILS - record.count, retryAfterSec: 0 }
}

function recordFailure(ip: string) {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    record.count++
  }
}

function clearFailures(ip: string) {
  attempts.delete(ip)
}

// ── POST /api/superadmin/login ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const { allowed, retryAfterSec } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    )
  }

  const body = await req.json().catch(() => ({}))
  const { password } = body
  const expected = process.env.SUPERADMIN_PASSWORD

  if (!expected) {
    return NextResponse.json({ error: 'Super admin not configured' }, { status: 500 })
  }

  if (!password || password !== expected) {
    recordFailure(ip)
    // Generic message — don't reveal whether password or config is wrong
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  clearFailures(ip)

  // Generate a random, one-time-use token and persist it.
  // Logout deletes the row — any browser holding the cookie becomes invalid.
  const token   = createSessionToken()
  const supabase = createAdminClient()
  const { error: dbErr } = await supabase
    .from('superadmin_sessions')
    .insert({ token })

  if (dbErr) {
    console.error('Failed to create superadmin session:', dbErr.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}
