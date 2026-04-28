import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/org-layouts — fetch all sections for the employee's org
export async function GET() {
  const employee = await requireRole(['ad']).catch(() => null)
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('org_field_layouts')
    .select('*')
    .eq('org_id', employee.org_id)
    .order('position', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ sections: data || [] })
}

// POST /api/org-layouts — create a new empty section
export async function POST(req: NextRequest) {
  const employee = await requireRole(['ad']).catch(() => null)
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { section_name, position } = await req.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('org_field_layouts')
    .insert({
      org_id: employee.org_id,
      section_name: section_name || 'New Section',
      position: position ?? 0,
      fields: [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ section: data })
}
