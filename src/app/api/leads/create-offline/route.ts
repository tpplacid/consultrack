import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertCanCreateLead, checkAndAlertQuota, bustQuotaCache } from '@/lib/leadQuota'

export async function POST(req: NextRequest) {
  const employee = await requireAuth()
  const { name, phone, source, location, lead_type, preferred_course, comments } = await req.json()

  if (!name || !phone) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 })

  const supabase = createAdminClient()

  // Get org + manager info
  const { data: emp } = await supabase
    .from('employees')
    .select('org_id, reports_to')
    .eq('id', employee.id)
    .single()

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  // Hard-block at lead ceiling (when enforcement is on for this org)
  try { await assertCanCreateLead(emp.org_id) }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 403 }) }

  // Build custom_data from dynamic fields (org-specific — not stored in columns)
  const custom_data: Record<string, string> = {}
  if (location)          custom_data.location          = location
  if (lead_type)         custom_data.lead_type          = lead_type
  if (preferred_course)  custom_data.preferred_course   = preferred_course
  if (comments)          custom_data.comments           = comments

  // Insert lead
  const { data: lead, error: leadError } = await supabase.from('leads').insert({
    org_id: emp.org_id,
    name,
    phone,
    source,
    main_stage: '0',
    owner_id: employee.id,
    reporting_manager_id: emp.reports_to,
    custom_data,
    approved: false,
  }).select().single()

  if (leadError || !lead) return NextResponse.json({ error: leadError?.message || 'Failed to create lead' }, { status: 400 })

  // Log activity
  await supabase.from('activities').insert({
    org_id: emp.org_id,
    lead_id: lead.id,
    employee_id: employee.id,
    activity_type: 'lead_created',
    note: `Lead created via ${source}`,
  })

  // Create approval request if employee has a manager
  if (emp.reports_to) {
    await supabase.from('offline_lead_approvals').insert({
      org_id: emp.org_id,
      lead_id: lead.id,
      submitted_by: employee.id,
      approver_id: emp.reports_to,
    })
  }

  // Bust admin-leads + analytics + quota caches; check & fire 80/100% alerts
  revalidateTag(`admin-leads:${emp.org_id}`, 'max')
  revalidateTag(`analytics:${emp.org_id}`, 'max')
  bustQuotaCache(emp.org_id)
  await checkAndAlertQuota(emp.org_id, 1)

  return NextResponse.json({ data: lead })
}
