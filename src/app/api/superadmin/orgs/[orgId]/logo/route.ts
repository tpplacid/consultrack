import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 })

  const supabase = createAdminClient()

  // Use a stable path per org so re-uploads overwrite the previous logo
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${orgId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('org-logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

  const { data: { publicUrl } } = supabase.storage
    .from('org-logos')
    .getPublicUrl(path)

  // Cache-bust so the browser picks up the new image even if the path is the same
  const logoUrl = `${publicUrl}?v=${Date.now()}`

  const { error: dbError } = await supabase
    .from('orgs')
    .update({ logo_url: logoUrl })
    .eq('id', orgId)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

  return NextResponse.json({ logo_url: logoUrl })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await params
  const supabase = createAdminClient()

  // Remove any logo files for this org
  const { data: files } = await supabase.storage.from('org-logos').list(orgId)
  if (files && files.length > 0) {
    await supabase.storage.from('org-logos').remove(files.map(f => `${orgId}/${f.name}`))
  }

  await supabase.from('orgs').update({ logo_url: null }).eq('id', orgId)

  return NextResponse.json({ ok: true })
}
