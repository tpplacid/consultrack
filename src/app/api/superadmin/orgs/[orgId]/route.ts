import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await params
  const body = await req.json()
  const { name, slug, features, brand_palette, meta_config, is_live } = body

  const supabase = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (slug !== undefined) updates.slug = slug
  if (features !== undefined) updates.features = features
  if (brand_palette !== undefined) updates.brand_palette = brand_palette
  if (meta_config !== undefined) updates.meta_config = meta_config
  if (is_live !== undefined) updates.is_live = is_live

  const { data, error } = await supabase
    .from('orgs')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ org: data })
}
