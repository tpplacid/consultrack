import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

// Calls Meta Graph API with the org's saved Page ID + access token and
// returns the page name on success or the actual Meta error message on
// failure. SA / client uses this when leads stop arriving — turns a
// "we're not getting webhooks" mystery into "your token expired on
// May 6th, regenerate it" in one click.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { orgId } = await params
  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('orgs').select('meta_config').eq('id', orgId).single()

  const cfg = (org?.meta_config ?? {}) as { page_id?: string; access_token?: string }
  const pageId = cfg.page_id?.trim()
  const token  = cfg.access_token?.trim()

  if (!pageId || !token) {
    return NextResponse.json({
      ok: false,
      error: 'Page ID and Access Token must both be saved before testing the connection.',
    })
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}?fields=name,access_token&access_token=${encodeURIComponent(token)}`
    )
    const data = await res.json() as { name?: string; error?: { message?: string } }
    if (data.error) {
      return NextResponse.json({ ok: false, error: data.error.message ?? 'Meta returned an error' })
    }
    return NextResponse.json({ ok: true, page_name: data.name ?? pageId })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Network error reaching graph.facebook.com',
    })
  }
}
