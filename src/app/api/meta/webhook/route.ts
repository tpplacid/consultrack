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
  console.log('[Meta Webhook] received body:', JSON.stringify(body))

  // Meta sends: { object: 'page', entry: [{ changes: [{ field: 'leadgen', value: { ... } }] }] }
  if (body.object !== 'page') {
    console.log('[Meta Webhook] not a page event, skipping')
    return NextResponse.json({ ok: true })
  }

  const supabase = createAdminClient()

  for (const entry of body.entry || []) {
    // entry.id is the Meta Page ID — use it to find the matching org
    const metaPageId = String(entry.id || '')

    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue
      const value = change.value
      console.log('[Meta Webhook] leadgen value:', JSON.stringify(value))

      // ── Resolve org by Meta Page ID ──────────────────────────
      // 1. Try to find an org whose meta_config->page_id matches this entry
      // 2. Fall back to the admishine org (backward compat for existing setup)
      let org: { id: string; meta_config: Record<string, string> | null } | null = null
      if (metaPageId) {
        const { data: byPage } = await supabase
          .from('orgs')
          .select('id, meta_config')
          .eq('meta_config->>page_id' as 'id', metaPageId)
          .maybeSingle()
        org = byPage ?? null
      }
      if (!org) {
        // Fallback: admishine (original hardcoded org)
        const { data: fallback } = await supabase
          .from('orgs')
          .select('id, meta_config')
          .eq('slug', 'admishine')
          .maybeSingle()
        org = fallback ?? null
      }
      if (!org) {
        console.warn('[Meta Webhook] no org found for page_id:', metaPageId, '— skipping')
        continue
      }

      // Use org-level access token if configured, else global env var
      const metaConfig = (org.meta_config ?? {}) as Record<string, string>
      const accessToken = metaConfig.access_token || process.env.META_PAGE_ACCESS_TOKEN || ''

      // Fetch full lead data from Meta Graph API
      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/v19.0/${value.leadgen_id}?fields=field_data,created_time&access_token=${accessToken}`
        )
        const leadData = await graphRes.json()
        console.log('[Meta Webhook] graph leadData:', JSON.stringify(leadData))
        if (leadData.error) { console.error('[Meta Webhook] Graph error:', leadData.error); continue }

        // Parse field_data array → key/value map
        const fields: Record<string, string> = {}
        for (const f of leadData.field_data || []) {
          fields[f.name] = f.values?.[0] || ''
        }
        console.log('[Meta Webhook] parsed fields:', JSON.stringify(fields))

        const phone = fields['phone_number'] || fields['phone'] || ''
        const name = `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim() || fields['full_name'] || 'Unknown'
        const metaLeadId = String(value.leadgen_id)

        if (!phone) {
          console.log('[Meta Webhook] no phone found, skipping. fields:', JSON.stringify(fields))
          continue
        }

        // Dedup by phone + meta_lead_id
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .or(`phone.eq.${phone},meta_lead_id.eq.${metaLeadId}`)
          .limit(1)

        if (existing && existing.length > 0) continue

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

// ── Weighted allocation: dynamic org roles, score-weighted within each tier ──
async function allocateLead(supabase: ReturnType<typeof createAdminClient>, orgId: string, date: Date) {
  const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()]
  const dateStr = date.toISOString().slice(0, 10)

  // Fetch org roles sorted by level desc (highest priority first) — exclude admin-only roles
  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select('key, level, can_access_admin')
    .eq('org_id', orgId)
    .eq('can_access_admin', false)
    .order('level', { ascending: false })

  // Fallback to default assignable roles if org has no custom roles
  const roleTiers = orgRoles && orgRoles.length > 0
    ? orgRoles.map(r => r.key)
    : ['tl', 'counsellor', 'telesales']

  // All active employees in assignable roles
  const { data: employees } = await supabase
    .from('employees')
    .select('id, role, score, reports_to')
    .eq('org_id', orgId)
    .in('role', roleTiers)
    .eq('is_active', true)
    .eq('is_on_leave', false)
    .eq('auto_allocate', true)

  if (!employees || employees.length === 0) return null

  // Filter out employees with weekoff today
  const { data: weekoffs } = await supabase
    .from('weekoffs')
    .select('employee_id')
    .eq('org_id', orgId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${dateStr}`)

  const weekoffIds = new Set((weekoffs || []).map(w => w.employee_id))
  const available = employees.filter(e => !weekoffIds.has(e.id) && (e.score ?? 1) > 0)
  if (available.length === 0) return null

  // Try each role tier in priority order
  for (const role of roleTiers) {
    const tier = available.filter(e => e.role === role)
    if (tier.length === 0) continue
    const totalWeight = tier.reduce((sum, e) => sum + (e.score ?? 1), 0)
    let rand = Math.random() * totalWeight
    for (const emp of tier) {
      rand -= (emp.score ?? 1)
      if (rand <= 0) return emp
    }
    return tier[0]
  }
  return null
}
