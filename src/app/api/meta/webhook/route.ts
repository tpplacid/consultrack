import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── GET: Meta webhook verification ──────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ── POST: Receive leads ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Meta sends: { object: 'page', entry: [{ changes: [{ field: 'leadgen', value: { ... } }] }] }
  if (body.object !== 'page') return NextResponse.json({ ok: true })

  const supabase = createAdminClient()

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue
      const value = change.value

      // Fetch full lead data from Meta Graph API
      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/v19.0/${value.leadgen_id}?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`
        )
        const leadData = await graphRes.json()
        if (leadData.error) { console.error('Meta Graph error:', leadData.error); continue }

        // Parse field_data array → key/value map
        const fields: Record<string, string> = {}
        for (const f of leadData.field_data || []) {
          fields[f.name] = f.values?.[0] || ''
        }

        const phone = fields['phone_number'] || fields['phone'] || ''
        const name = `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim() || fields['full_name'] || 'Unknown'
        const metaLeadId = String(value.leadgen_id)

        if (!phone) continue

        // Dedup by phone + meta_lead_id
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .or(`phone.eq.${phone},meta_lead_id.eq.${metaLeadId}`)
          .limit(1)

        if (existing && existing.length > 0) continue

        // Get default org (in multi-tenant, match by page ID)
        const { data: org } = await supabase
          .from('orgs')
          .select('id')
          .eq('slug', 'admishine')
          .single()

        if (!org) continue

        // Allocation: find best available telesales/counsellor
        const owner = await allocateLead(supabase, org.id, new Date())

        // Insert lead
        const { data: lead, error } = await supabase.from('leads').insert({
          org_id: org.id,
          name,
          phone,
          source: 'meta',
          main_stage: '0',
          meta_lead_id: metaLeadId,
          owner_id: owner?.id || null,
          reporting_manager_id: owner?.reports_to || null,
          preferred_course: fields['course'] || fields['program'] || null,
          location: fields['city'] || fields['location'] || null,
          approved: true,
          sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day initial
        }).select().single()

        if (!error && lead) {
          await supabase.from('activities').insert({
            org_id: org.id,
            lead_id: lead.id,
            employee_id: owner?.id || lead.owner_id,
            activity_type: 'lead_created',
            note: 'Lead created from Meta Leads API',
          })
        }
      } catch (err) {
        console.error('Error processing Meta lead:', err)
      }
    }
  }

  return NextResponse.json({ ok: true })
}

// ── Weighted allocation ──────────────────────────────────────
async function allocateLead(supabase: ReturnType<typeof createAdminClient>, orgId: string, date: Date) {
  const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()]
  const dateStr = date.toISOString().slice(0, 10)

  // Get all active employees (telesales + counsellors) not on leave and no weekoff today
  const { data: employees } = await supabase
    .from('employees')
    .select('id, score, reports_to')
    .eq('org_id', orgId)
    .in('role', ['telesales', 'counsellor'])
    .eq('is_active', true)
    .eq('is_on_leave', false)

  if (!employees || employees.length === 0) return null

  // Filter out employees with weekoff today
  const { data: weekoffs } = await supabase
    .from('weekoffs')
    .select('employee_id')
    .eq('org_id', orgId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${dateStr}`)

  const weekoffIds = new Set((weekoffs || []).map(w => w.employee_id))
  const available = employees.filter(e => !weekoffIds.has(e.id))
  if (available.length === 0) return null

  // Weighted random selection by score
  const totalWeight = available.reduce((sum, e) => sum + e.score, 0)
  let rand = Math.random() * totalWeight
  for (const emp of available) {
    rand -= emp.score
    if (rand <= 0) return emp
  }
  return available[0]
}
