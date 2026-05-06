import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'
import { getQuotaState, checkAndAlertQuota, bustQuotaCache } from '@/lib/leadQuota'

// ── GET: Meta/Instagram webhook verification ─────────────────
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

// ── POST: Receive leads from Facebook and Instagram ──────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

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

  const objectType = String(body.object ?? '')

  // Route to the appropriate handler based on Meta object type
  if (objectType === 'page') {
    await handleFacebookLeads(body)
  } else if (objectType === 'instagram') {
    await handleInstagramLeads(body)
  }

  // Always 200 — Meta will disable the endpoint on non-2xx
  return NextResponse.json({ ok: true })
}

// ── Facebook (Page) lead handler ─────────────────────────────
async function handleFacebookLeads(body: Record<string, unknown>) {
  const supabase = createAdminClient()

  for (const entry of (body.entry as Record<string, unknown>[]) || []) {
    const pageId = String(entry.id || '')

    for (const change of (entry.changes as Record<string, unknown>[]) || []) {
      if ((change as { field: string }).field !== 'leadgen') continue
      const value = change.value as Record<string, unknown>

      let org: { id: string; meta_config: Record<string, string> | null } | null = null

      if (pageId) {
        const { data: byPage } = await supabase
          .from('orgs')
          .select('id, meta_config')
          .eq('meta_config->>page_id' as 'id', pageId)
          .maybeSingle()
        org = byPage ?? null
      }

      if (!org) {
        console.warn('[Meta Webhook] no org found for page_id:', pageId)
        continue
      }

      const metaConfig  = (org.meta_config ?? {}) as Record<string, string>
      const accessToken = metaConfig.access_token || process.env.META_PAGE_ACCESS_TOKEN || ''

      if (!accessToken) {
        console.error('[Meta Webhook] no access token for org:', org.id)
        continue
      }

      await processLeadgenEvent({
        supabase,
        orgId:       org.id,
        accessToken,
        leadgenId:   String(value.leadgen_id),
        source:      'meta',
        idField:     'meta_lead_id',
      })
    }
  }
}

// ── Instagram lead handler ───────────────────────────────────
async function handleInstagramLeads(body: Record<string, unknown>) {
  const supabase = createAdminClient()

  for (const entry of (body.entry as Record<string, unknown>[]) || []) {
    const igAccountId = String(entry.id || '')

    for (const change of (entry.changes as Record<string, unknown>[]) || []) {
      if ((change as { field: string }).field !== 'leadgen') continue
      const value = change.value as Record<string, unknown>

      let org: { id: string; instagram_config: Record<string, string> | null } | null = null

      if (igAccountId) {
        const { data: byAccount } = await supabase
          .from('orgs')
          .select('id, instagram_config')
          .eq('instagram_config->>ig_account_id' as 'id', igAccountId)
          .maybeSingle()
        org = byAccount ?? null
      }

      if (!org) {
        console.warn('[Instagram Webhook] no org found for ig_account_id:', igAccountId)
        continue
      }

      const igConfig    = (org.instagram_config ?? {}) as Record<string, string>
      const accessToken = igConfig.access_token || process.env.META_PAGE_ACCESS_TOKEN || ''

      if (!accessToken) {
        console.error('[Instagram Webhook] no access token for org:', org.id)
        continue
      }

      await processLeadgenEvent({
        supabase,
        orgId:       org.id,
        accessToken,
        leadgenId:   String(value.leadgen_id),
        source:      'instagram',
        idField:     'instagram_lead_id',
        igUsername:  (value.ig_username as string | undefined),
      })
    }
  }
}

// ── Shared lead processing ────────────────────────────────────
async function processLeadgenEvent({
  supabase,
  orgId,
  accessToken,
  leadgenId,
  source,
  idField,
  igUsername,
}: {
  supabase:    ReturnType<typeof createAdminClient>
  orgId:       string
  accessToken: string
  leadgenId:   string
  source:      'meta' | 'instagram'
  idField:     'meta_lead_id' | 'instagram_lead_id'
  igUsername?: string
}) {
  try {
    const graphRes = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,created_time&access_token=${accessToken}`
    )
    const leadData = await graphRes.json() as Record<string, unknown>

    if (leadData.error) {
      console.error(`[${source} Webhook] Graph API error:`, leadData.error)
      return
    }

    const fields: Record<string, string> = {}
    for (const f of (leadData.field_data as { name: string; values: string[] }[] || [])) {
      fields[f.name] = f.values?.[0] ?? ''
    }

    const phone = fields['phone_number'] || fields['phone'] || ''
    const name  = `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim()
               || fields['full_name'] || 'Unknown'
    const email = fields['email'] || null

    if (!phone) {
      console.warn(`[${source} Webhook] no phone in lead`, leadgenId, '— fields:', Object.keys(fields))
      return
    }

    // Dedup: skip if phone or platform lead_id already exists for this org
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('org_id', orgId)
      .or(`phone.eq.${phone},${idField}.eq.${leadgenId}`)
      .limit(1)

    if (existing && existing.length > 0) {
      console.info(`[${source} Webhook] duplicate lead, skipping:`, leadgenId)
      return
    }

    const owner = await allocateLead(supabase, orgId, new Date())

    const customData: Record<string, string> = {}
    const course   = fields['course']   || fields['program']  || ''
    const location = fields['city']     || fields['location'] || ''
    const username = igUsername || fields['username'] || fields['ig_username'] || ''
    if (course)    customData.preferred_course = course
    if (location)  customData.location         = location
    if (email)     customData.email            = email
    if (username)  customData.ig_username      = username

    const quota = await getQuotaState(orgId)
    if (quota.atLimit) {
      console.warn(`[${source} Webhook] DROPPED lead — org ${orgId} at quota (${quota.count}/${quota.limit})`)
      await checkAndAlertQuota(orgId, 0)
      return
    }

    const insertPayload: Record<string, unknown> = {
      org_id:               orgId,
      name,
      phone,
      source,
      main_stage:           '0',
      [idField]:            leadgenId,
      owner_id:             owner?.id        ?? null,
      reporting_manager_id: owner?.reports_to ?? null,
      custom_data:          customData,
      approved:             true,
      sla_deadline:         new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert(insertPayload)
      .select()
      .single()

    if (leadErr) {
      console.error(`[${source} Webhook] lead insert error:`, leadErr.message)
      return
    }

    const platformLabel = source === 'instagram' ? 'Instagram Lead Ads' : 'Meta Lead Ads'
    await supabase.from('activities').insert({
      org_id:        orgId,
      lead_id:       lead.id,
      employee_id:   owner?.id ?? null,
      activity_type: 'lead_created',
      note:          `Lead created from ${platformLabel}`,
    })

    revalidateTag(`admin-leads:${orgId}`, 'max')
    revalidateTag(`analytics:${orgId}`, 'max')
    bustQuotaCache(orgId)
    await checkAndAlertQuota(orgId, 1)

    console.info(`[${source} Webhook] lead created:`, lead.id, 'owner:', owner?.id ?? 'unassigned')

  } catch (err) {
    console.error(`[${source} Webhook] unexpected error:`, err)
  }
}

// ── Weighted allocation: dynamic org roles, score-weighted within each tier ──
async function allocateLead(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  date: Date
) {
  const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()]
  const dateStr   = date.toISOString().slice(0, 10)

  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select('key, level')
    .eq('org_id', orgId)
    .eq('can_access_admin', false)
    .order('level', { ascending: false })

  const roleTiers = orgRoles && orgRoles.length > 0
    ? orgRoles.map(r => r.key)
    : ['tl', 'counsellor', 'telesales']

  const { data: employees } = await supabase
    .from('employees')
    .select('id, role, score, reports_to')
    .eq('org_id', orgId)
    .in('role', roleTiers)
    .eq('is_active', true)
    .eq('is_on_leave', false)
    .eq('auto_allocate', true)

  if (!employees || employees.length === 0) return null

  const { data: weekoffs } = await supabase
    .from('weekoffs')
    .select('employee_id')
    .eq('org_id', orgId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${dateStr}`)

  const weekoffIds = new Set((weekoffs || []).map(w => w.employee_id))
  const available  = employees.filter(e => !weekoffIds.has(e.id) && (e.score ?? 1) > 0)
  if (available.length === 0) return null

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
