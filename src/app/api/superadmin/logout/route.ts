// GET /api/superadmin/logout
//
// Returns a 200 HTML page — NOT a redirect.
// Why: every previous approach (302/307 + Set-Cookie) had a race condition in Arc
// where the browser could navigate before fully committing the Set-Cookie header.
//
// With a 200 response, the browser:
//   1. Receives the response headers (including Set-Cookie) → cookie cleared
//   2. Parses the HTML body
//   3. Runs the inline <script> → navigates to /superadmin/login
// Steps 1 and 2 always complete before step 3. No race possible.
//
// Set-Cookie is written as a raw header (not via Next.js cookies API)
// to bypass any framework abstractions.

const COOKIE = '__ct_sa'
const CLEAR  = `${COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`

export async function GET() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Signing out…</title>
</head>
<body style="margin:0;background:#000;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;font-size:14px">
  Signing out…
  <script>window.location.replace('/superadmin/login')</script>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': CLEAR,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    },
  )
}

// POST kept for any programmatic callers
export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': CLEAR,
      'Cache-Control': 'no-store',
    },
  })
}
