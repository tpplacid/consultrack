import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/export
// Admin-only. Returns a ZIP with everything the org owns:
//   - leads.csv         every lead, base columns + every key in custom_data flattened
//   - activities.csv    full audit trail (employee_name resolved)
//   - employees.csv     team roster (no passwords)
//   - attendance.csv    when feature enabled
//   - leaves.csv        when feature enabled
//   - sla_breaches.csv  when feature enabled
//   - org_config.json   stages, sub-stages, roles, sources, field_layouts, brand
//   - README.txt        manifest with row counts + export timestamp
//
// This endpoint NEVER deletes anything. Reset is a separate action via
// /api/admin/reset-org.

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',')
  const body = rows.map(r => columns.map(c => csvEscape(r[c])).join(',')).join('\n')
  return header + (body ? '\n' + body : '')
}

export async function GET() {
  const employee = await requireRole(['ad'])
  const orgId = employee.org_id
  const supabase = createAdminClient()

  const [
    { data: org },
    { data: leads },
    { data: activities },
    { data: employees },
    { data: attendance },
    { data: leaves },
    { data: breaches },
    { data: stages },
    { data: substages },
    { data: roles },
    { data: layouts },
  ] = await Promise.all([
    supabase.from('orgs').select('id, name, slug, features, brand_palette, lead_sources, lead_limit, lead_limit_enforced, created_at').eq('id', orgId).single(),
    // No `email` column on leads — schema only has phone. (Email may live in
    // custom_data per org's field schema, which we flatten below anyway.)
    supabase.from('leads').select(`
      id, name, phone, source, main_stage, sub_stage, owner_id,
      reporting_manager_id, approved, approved_by, meta_lead_id,
      created_at, updated_at, stage_entered_at, sla_deadline, next_followup_at,
      custom_data,
      owner:employees!leads_owner_id_fkey(name)
    `).eq('org_id', orgId).order('created_at', { ascending: true }),
    supabase.from('activities').select(`
      lead_id, activity_type, note, created_at,
      employee:employees!activities_employee_id_fkey(name)
    `).eq('org_id', orgId).order('created_at', { ascending: true }),
    supabase.from('employees').select('id, name, email, role, reports_to, is_active, created_at').eq('org_id', orgId),
    supabase.from('attendance').select(`
      date, clock_in, clock_out, status, hours_worked,
      employee:employees!attendance_employee_id_fkey(name)
    `).eq('org_id', orgId).order('date', { ascending: false }),
    supabase.from('leaves').select(`
      type, start_date, end_date, status, reason, created_at,
      employee:employees!leaves_employee_id_fkey(name),
      approver:employees!leaves_approved_by_fkey(name)
    `).eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('sla_breaches').select(`
      lead_id, breached_at, resolution, resolved_at, created_at,
      owner:employees!sla_breaches_owner_id_fkey(name)
    `).eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('org_stages').select('*').eq('org_id', orgId).order('position'),
    supabase.from('org_stage_substages').select('*').eq('org_id', orgId).order('position'),
    supabase.from('org_roles').select('*').eq('org_id', orgId).order('position'),
    supabase.from('org_field_layouts').select('*').eq('org_id', orgId).order('position'),
  ])

  // leads.csv: flatten custom_data into top-level columns dynamically
  type LeadRow = Record<string, unknown> & { custom_data?: Record<string, unknown> | null; owner?: { name?: string } | null }
  const leadRows = (leads || []) as unknown as LeadRow[]
  const customKeys = new Set<string>()
  for (const l of leadRows) {
    const cd = (l.custom_data ?? {}) as Record<string, unknown>
    for (const k of Object.keys(cd)) customKeys.add(k)
  }
  const leadColumns = [
    'id', 'name', 'phone', 'source', 'main_stage', 'sub_stage',
    'owner_name', 'reporting_manager_id', 'approved', 'approved_by', 'meta_lead_id',
    'created_at', 'updated_at', 'stage_entered_at', 'sla_deadline', 'next_followup_at',
    ...Array.from(customKeys).sort(),
  ]
  const leadsFlat = leadRows.map(l => {
    const cd = (l.custom_data ?? {}) as Record<string, unknown>
    const flat: Record<string, unknown> = { ...l, owner_name: l.owner?.name ?? '' }
    delete flat.custom_data
    delete flat.owner
    for (const k of customKeys) flat[k] = cd[k] ?? ''
    return flat
  })

  // activities.csv
  type ActivityRow = { lead_id: string; activity_type: string; note: string; created_at: string; employee?: { name?: string } | null }
  const actRows = (activities || []).map((a) => {
    const aa = a as unknown as ActivityRow
    return {
      lead_id: aa.lead_id,
      employee_name: aa.employee?.name ?? '',
      activity_type: aa.activity_type,
      note: aa.note,
      created_at: aa.created_at,
    }
  })

  // employees.csv — resolve reports_to to manager name for readability
  type EmpRow = { id: string; name: string; email: string; role: string; reports_to: string | null; is_active: boolean; created_at: string }
  const empRows = (employees || []) as EmpRow[]
  const empNameById = new Map(empRows.map(e => [e.id, e.name]))
  const employeesFlat = empRows.map(e => ({
    name: e.name,
    email: e.email,
    role: e.role,
    reports_to_name: e.reports_to ? (empNameById.get(e.reports_to) ?? '') : '',
    is_active: e.is_active,
    created_at: e.created_at,
  }))

  // attendance / leaves / breaches
  type AttRow = { date: string; clock_in: string | null; clock_out: string | null; status: string; hours_worked: number | null; employee?: { name?: string } | null }
  const attRows = (attendance || []).map(a => {
    const aa = a as unknown as AttRow
    return {
      employee_name: aa.employee?.name ?? '',
      date: aa.date,
      clock_in: aa.clock_in,
      clock_out: aa.clock_out,
      status: aa.status,
      hours_worked: aa.hours_worked,
    }
  })

  type LeaveRow = { type: string; start_date: string; end_date: string; status: string; reason: string; created_at: string; employee?: { name?: string } | null; approver?: { name?: string } | null }
  const leaveRows = (leaves || []).map(l => {
    const ll = l as unknown as LeaveRow
    return {
      employee_name: ll.employee?.name ?? '',
      type: ll.type,
      start_date: ll.start_date,
      end_date: ll.end_date,
      status: ll.status,
      reason: ll.reason,
      approver_name: ll.approver?.name ?? '',
      created_at: ll.created_at,
    }
  })

  type BreachRow = { lead_id: string; breached_at: string; resolution: string; resolved_at: string | null; created_at: string; owner?: { name?: string } | null }
  const breachRows = (breaches || []).map(b => {
    const bb = b as unknown as BreachRow
    return {
      lead_id: bb.lead_id,
      owner_name: bb.owner?.name ?? '',
      breached_at: bb.breached_at,
      resolution: bb.resolution,
      resolved_at: bb.resolved_at,
      created_at: bb.created_at,
    }
  })

  // Build the ZIP
  const zip = new JSZip()
  zip.file('leads.csv', rowsToCSV(leadsFlat, leadColumns))
  zip.file('activities.csv', rowsToCSV(actRows, ['lead_id', 'employee_name', 'activity_type', 'note', 'created_at']))
  zip.file('employees.csv', rowsToCSV(employeesFlat, ['name', 'email', 'role', 'reports_to_name', 'is_active', 'created_at']))
  if (attRows.length)    zip.file('attendance.csv',    rowsToCSV(attRows,    ['employee_name', 'date', 'clock_in', 'clock_out', 'status', 'hours_worked']))
  if (leaveRows.length)  zip.file('leaves.csv',        rowsToCSV(leaveRows,  ['employee_name', 'type', 'start_date', 'end_date', 'status', 'reason', 'approver_name', 'created_at']))
  if (breachRows.length) zip.file('sla_breaches.csv', rowsToCSV(breachRows, ['lead_id', 'owner_name', 'breached_at', 'resolution', 'resolved_at', 'created_at']))

  zip.file('org_config.json', JSON.stringify({
    org, stages, substages, roles, field_layouts: layouts,
  }, null, 2))

  const stamp = new Date().toISOString()
  zip.file('README.txt', [
    `${org?.name ?? 'Organisation'} — Consultrack data export`,
    `Exported at: ${stamp}`,
    `Org ID: ${orgId}`,
    `Org slug: ${org?.slug ?? ''}`,
    '',
    'Contents:',
    `  leads.csv         (${leadsFlat.length} row${leadsFlat.length === 1 ? '' : 's'})`,
    `  activities.csv    (${actRows.length} row${actRows.length === 1 ? '' : 's'})`,
    `  employees.csv     (${employeesFlat.length} row${employeesFlat.length === 1 ? '' : 's'})`,
    `  attendance.csv    (${attRows.length} row${attRows.length === 1 ? '' : 's'})`,
    `  leaves.csv        (${leaveRows.length} row${leaveRows.length === 1 ? '' : 's'})`,
    `  sla_breaches.csv  (${breachRows.length} row${breachRows.length === 1 ? '' : 's'})`,
    `  org_config.json   (stages, roles, sources, field layouts, brand)`,
    '',
    'leads.csv columns: base lead fields + every custom_data key as its own column.',
    '',
    'This export is a snapshot — it does NOT delete any data.',
    'Use Settings → Reset Data if you want to wipe and start fresh.',
  ].join('\n'))

  const buffer = await zip.generateAsync({ type: 'nodebuffer' })

  const filename = `${org?.slug ?? 'consultrack'}-export-${stamp.slice(0, 10)}.zip`
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
