import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'

// ── GET: Meta webhook verification ──────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ── POST: Receive leads ──────────────────────────────────────
export async function POST(req: NextRequest) {
  // Read raw body first so we can verify the signature
  const rawBody = await req.text()

  // Signature verification — only enforced when META_APP_SECRET is configured
  const appSecret = process.env.META_APP_SECRET
  if (appSecret) {
    const sig      = req.headers.get('x-hub-signature-256') ?? ''
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
    if (sig !== expected) {
      console.warn('[Meta Webhook] signature mismatch — rejecting request')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let body: Record<string, unknown>
  try { body = JSON.parse(rawBody) } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  // Meta sends: { object: 'page', entry: [{ id: PAGE_ID, changes: [{ field: 'leadgen', value: ... }] }] }
  if (body.object !== 'page') return NextResponse.json({ ok: true })

  const supabase = createAdminClient()

  for (const entry of (body.entry as Record<string, unknown>[]) || []) {
    const metaPageId = String(entry.id || '')

    for (const change of (entry.changes as Record<string, unknown>[]) || []) {
      if ((change as { field: string }).field !== 'leadgen') continue
      const value = change.value as Record<string, unknown>

      // ── Resolve org by Meta Page ID ──────────────────────
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
        console.warn('[Meta Webhook] no org found for page_id:', metaPageId)
        continue
      }

      const metaConfig  = (org.meta_config ?? {}) as Record<string, string>
      const accessToken = metaConfig.access_token || process.env.META_PAGE_ACCESS_TOKEN || ''

      if (!accessToken) {
        console.error('[Meta Webhook] no access token for org:', org.id)
        continue
      }

      try {
        // Fetch full lead data from Meta Graph API
        const graphRes  = await fetch(
          `https://graph.facebook.com/v19.0/${value.leadgen_id}?fields=field_data,created_time&access_token=${accessToken}`
        )
        const leadData = await graphRes.json() as Record<string, unknown>

        if (leadData.error) {
          console.error('[Meta Webhook] Graph API error:', leadData.error)
          continue
        }

        // Parse field_data array → key/value map
        const fields: Record<string, string> = {}
        for (const f of (leadData.field_data as { name: string; values: string[] }[] || [])) {
          fields[f.name] = f.values?.[0] ?? ''
        }

        const phone      = fields['phone_number'] || fields['phone'] || ''
        const name       = `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim()
                         || fields['full_name'] || 'Unknown'
        const metaLeadId = String(value.leadgen_id)
        const email      = fields['email'] || null

        if (!phone) {
          console.warn('[Meta Webhook] no phone in lead', metaLeadId, '— fields:', Object.keys(fields))
          continue
        }

        // Dedup: skip if phone or meta_lead_id already exists
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('org_id', org.id)
          .or(`phone.eq.${phone},meta_lead_id.eq.${metaLeadId}`)
          .limit(1)

        if (existing && existing.length > 0) {
          console.info('[Meta Webhook] duplicate lead, skipping:', metaLeadId)
          continue
        }

        // Allocate to best available employee
        const owner = await allocateLead(supabase, org.id, new Date())

        // Build custom_data from Meta field_data (org-specific fields)
        const metaCustomData: Record<string, string> = {}
        const metaCourse   = fields['course']   || fields['program']  || ''
        const metaLocation = fields['city']     || fields['location'] || ''
        if (metaCourse)   metaCustomData.preferred_course = metaCourse
        if (metaLocation) metaCustomData.location         = metaLocation

        // Insert lead
        const { data: lead, error: leadErr } = await supabase
          .from('leads')
          .insert({
            org_id:               org.id,
            name,
            phone,
            email,
            source:               'meta',
            main_stage:           '0',
            meta_lead_id:         metaLeadId,
            owner_id:             owner?.id    ?? null,
            reporting_manager_id: owner?.reports_to ?? null,
            custom_data:          metaCustomData,
            approved:             true,
            sla_deadline:         new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (leadErr) {
          console.error('[Meta Webhook] lead insert error:', leadErr.message)
          continue
        }

        // Audit trail
        const { error: actErr } = await supabase.from('activities').insert({
          org_id:        org.id,
          lead_id:       lead.id,
          employee_id:   owner?.id ?? null,
          activity_type: 'lead_created',
          note:          'Lead created from Meta Lead Ads',
        })
        if (actErr) console.error('[Meta Webhook] activity insert error:', actErr.message)

        console.info('[Meta Webhook] lead created:', lead.id, 'owner:', owner?.id ?? 'unassigned')

      } catch (err) {
        console.error('[Meta Webhook] unexpected error:', err)
      }
    }
  }

  // Always 200 — Meta will disable the endpoint on non-2xx
  return NextResponse.json({ ok: true })
}

// ── Weighted allocation: dynamic org roles, score-weighted within each tier ──
async function allocateLead(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  date: Date
) {
  const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()]
  const dateStr   = date.toISOString().slice(0, 10)

  // Org roles sorted highest level first, skip admin-only roles
  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select('key, level')
    .eq('org_id', orgId)
    .eq('can_access_admin', false)
    .order('level', { ascending: false })

  const roleTiers = orgRoles && orgRoles.length > 0
    ? orgRoles.map(r => r.key)
    : ['tl', 'counsellor', 'telesales']

  // Active, available, auto-allocate employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, role, score, reports_to')
    .eq('org_id', orgId)
    .in('role', roleTiers)
    .eq('is_active', true)
    .eq('is_on_leave', false)
    .eq('auto_allocate', true)

  if (!employees || employees.length === 0) return null

  // Exclude employees on weekoff today
  const { data: weekoffs } = await supabase
    .from('weekoffs')
    .select('employee_id')
    .eq('org_id', orgId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${dateStr}`)

  const weekoffIds = new Set((weekoffs || []).map(w => w.employee_id))
  const available  = employees.filter(e => !weekoffIds.has(e.id) && (e.score ?? 1) > 0)
  if (available.length === 0) return null

  // Weighted random selection, highest role tier first
  for (const role of roleTiers) {
    const tier        = available.filter(e => e.role === role)
    if (tier.length === 0) continue
    const totalWeight = tier.reduce((sum, e) => sum + (e.score ?? 1), 0)
    let   rand        = Math.random() * totalWeight
    for (const emp of tier) {
      rand -= (emp.score ?? 1)
      if (rand <= 0) return emp
    }
    return tier[0]
  }
  return null
}
