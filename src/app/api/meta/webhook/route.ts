import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'
import { getQuotaState, checkAndAlertQuota, bustQuotaCache } from '@/lib/leadQuota'
import { computeSlaDeadline, type SlaConfig, type SlaConfigBySource } from '@/lib/sla'

const ONE_DAY_MS = 86400000

// Pull both org-wide sla_config and per-source overrides at the start of
// each webhook batch so all handlers in the loop share the same snapshot.
async function fetchOrgSla(supabase: ReturnType<typeof createAdminClient>, orgId: string) {
  const { data } = await supabase
    .from('orgs').select('sla_config, sla_config_by_source').eq('id', orgId).maybeSingle()
  return {
    slaConfig:         (data?.sla_config         ?? null) as SlaConfig | null,
    slaConfigBySource: (data?.sla_config_by_source ?? null) as SlaConfigBySource | null,
  }
}

function deadlineFor(args: {
  stage: string; source: string
  slaConfig: SlaConfig | null
  slaConfigBySource: SlaConfigBySource | null
}): string {
  const dt = computeSlaDeadline({
    stage:                args.stage,
    source:               args.source,
    orgSlaConfig:         args.slaConfig,
    orgSlaConfigBySource: args.slaConfigBySource,
  })
  // Webhook leads always need *some* deadline so they show up in stuck-leads;
  // fall back to 24 h when the org hasn't configured one for this stage.
  return (dt ?? new Date(Date.now() + ONE_DAY_MS)).toISOString()
}

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

// ── POST: Receive all Meta/Instagram webhook events ──────────
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

  if (objectType === 'page') {
    await handleFacebookLeads(body)
  } else if (objectType === 'instagram') {
    await handleInstagramEvents(body)
  }

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
          .from('orgs').select('id, meta_config')
          .eq('meta_config->>page_id' as 'id', pageId).maybeSingle()
        org = byPage ?? null
      }

      if (!org) { console.warn('[Meta Webhook] no org found for page_id:', pageId); continue }

      const metaConfig  = (org.meta_config ?? {}) as Record<string, string>
      const accessToken = metaConfig.access_token || process.env.META_PAGE_ACCESS_TOKEN || ''
      if (!accessToken) { console.error('[Meta Webhook] no access token for org:', org.id); continue }

      const sla = await fetchOrgSla(supabase, org.id)

      await processLeadgenEvent({ supabase, orgId: org.id, accessToken, ...sla,
        leadgenId: String(value.leadgen_id), source: 'meta', idField: 'meta_lead_id' })
    }
  }
}

// ── Instagram events router ──────────────────────────────────
async function handleInstagramEvents(body: Record<string, unknown>) {
  const supabase = createAdminClient()

  for (const entry of (body.entry as Record<string, unknown>[]) || []) {
    const igAccountId = String(entry.id || '')

    const { data: org } = await supabase
      .from('orgs').select('id, instagram_config')
      .eq('instagram_config->>ig_account_id' as 'id', igAccountId).maybeSingle()

    if (!org) { console.warn('[Instagram Webhook] no org found for ig_account_id:', igAccountId); continue }

    const igConfig    = (org.instagram_config ?? {}) as IgConfig
    const accessToken = igConfig.access_token || process.env.META_PAGE_ACCESS_TOKEN || ''
    const signals     = igConfig.signals ?? {}

    if (!accessToken) { console.error('[Instagram Webhook] no access token for org:', org.id); continue }

    const sla = await fetchOrgSla(supabase, org.id)

    // Lead Ads + Comments + Mentions all come via entry.changes
    for (const change of (entry.changes as Record<string, unknown>[]) || []) {
      const field = (change as { field: string }).field
      const value = change.value as Record<string, unknown>

      if (field === 'leadgen') {
        await processLeadgenEvent({ supabase, orgId: org.id, accessToken, ...sla,
          leadgenId: String(value.leadgen_id), source: 'instagram', idField: 'instagram_lead_id',
          igUsername: value.ig_username as string | undefined })
      } else if (field === 'comments' && signals.comments_enabled) {
        await handleCommentEvent({ supabase, orgId: org.id, accessToken, ...sla, value, signals })
      } else if (field === 'mentions' && signals.mentions_enabled) {
        await handleMentionEvent({ supabase, orgId: org.id, accessToken, ...sla, value })
      }
    }

    // DMs + Story replies come via entry.messaging
    if (signals.dms_enabled) {
      for (const msg of (entry.messaging as Record<string, unknown>[]) || []) {
        const senderId = (msg.sender as { id: string })?.id
        if (!senderId || senderId === igAccountId) continue  // skip echo
        await handleDmEvent({ supabase, orgId: org.id, accessToken, ...sla, igAccountId, msg })
      }
    }
  }
}

// ── Shared Lead Ads processor ────────────────────────────────
async function processLeadgenEvent({ supabase, orgId, accessToken, leadgenId, source, idField, igUsername, slaConfig, slaConfigBySource }: {
  supabase:          ReturnType<typeof createAdminClient>
  orgId:             string
  accessToken:       string
  leadgenId:         string
  source:            'meta' | 'instagram'
  idField:           'meta_lead_id' | 'instagram_lead_id'
  igUsername?:       string
  slaConfig:         SlaConfig | null
  slaConfigBySource: SlaConfigBySource | null
}) {
  try {
    const graphRes = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,created_time&access_token=${accessToken}`)
    const leadData = await graphRes.json() as Record<string, unknown>

    if (leadData.error) { console.error(`[${source} Webhook] Graph API error:`, leadData.error); return }

    const fields: Record<string, string> = {}
    for (const f of (leadData.field_data as { name: string; values: string[] }[] || [])) {
      fields[f.name] = f.values?.[0] ?? ''
    }

    const phone = fields['phone_number'] || fields['phone'] || ''
    const email = fields['email']  || ''
    const name  = `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim()
                  || fields['full_name']
                  || email
                  || `Lead ${leadgenId.slice(-4)}`

    if (!phone) {
      console.info(`[${source} Webhook] no phone in lead (creating anyway):`, leadgenId)
    }

    // Dedupe by leadgen_id always; only fall back to phone when we have one,
    // since phone.eq. with empty value would match every phone-less lead.
    const dedupeFilter = phone
      ? `phone.eq.${phone},${idField}.eq.${leadgenId}`
      : `${idField}.eq.${leadgenId}`
    const { data: existing } = await supabase.from('leads').select('id').eq('org_id', orgId)
      .or(dedupeFilter).limit(1)
    if (existing && existing.length > 0) { console.info(`[${source} Webhook] duplicate, skipping:`, leadgenId); return }

    const owner      = await allocateLead(supabase, orgId, new Date())
    const customData: Record<string, string> = {}
    const course     = fields['course'] || fields['program'] || ''
    const location   = fields['city']   || fields['location'] || ''
    const username   = igUsername || fields['username'] || fields['ig_username'] || ''
    if (course)   customData.preferred_course = course
    if (location) customData.location         = location
    if (email)    customData.email            = email
    if (username) customData.ig_username      = username

    const quota = await getQuotaState(orgId)
    if (quota.atLimit) { await checkAndAlertQuota(orgId, 0); return }

    const { data: lead, error: leadErr } = await supabase.from('leads').insert({
      org_id: orgId, name, phone: phone || null, source, main_stage: '0',
      [idField]: leadgenId,
      owner_id: owner?.id ?? null, reporting_manager_id: owner?.reports_to ?? null,
      custom_data: customData, approved: true,
      sla_deadline: deadlineFor({ stage: '0', source, slaConfig, slaConfigBySource }),
    }).select().single()

    if (leadErr) { console.error(`[${source} Webhook] insert error:`, leadErr.message); return }

    await supabase.from('activities').insert({ org_id: orgId, lead_id: lead.id,
      employee_id: owner?.id ?? null, activity_type: 'lead_created',
      note: `Lead created from ${source === 'instagram' ? 'Instagram Lead Ads' : 'Meta Lead Ads'}` })

    revalidateTag(`admin-leads:${orgId}`, 'max')
    revalidateTag(`analytics:${orgId}`, 'max')
    bustQuotaCache(orgId)
    await checkAndAlertQuota(orgId, 1)
  } catch (err) { console.error(`[${source} Webhook] unexpected error:`, err) }
}

// ── DM / Story reply handler ─────────────────────────────────
async function handleDmEvent({ supabase, orgId, accessToken, igAccountId, msg, slaConfig, slaConfigBySource }: {
  supabase:          ReturnType<typeof createAdminClient>
  orgId:             string; accessToken: string; igAccountId: string
  msg:               Record<string, unknown>
  slaConfig:         SlaConfig | null
  slaConfigBySource: SlaConfigBySource | null
}) {
  try {
    const senderId    = (msg.sender as { id: string })?.id
    const message     = msg.message as Record<string, unknown>
    const isStoryReply = !!(message?.reply_to as Record<string, unknown> | undefined)?.story

    const { data: existing } = await supabase.from('leads').select('id')
      .eq('org_id', orgId).eq('instagram_thread_id', senderId).limit(1)
    if (existing && existing.length > 0) return

    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/${senderId}?fields=name,username&access_token=${accessToken}`)
    const profile = await profileRes.json() as { name?: string; username?: string; error?: { message?: string } }
    if (profile.error) {
      console.warn('[Instagram DM] profile fetch failed (creating lead with placeholder name):',
        senderId, profile.error.message)
    }

    const name     = profile.name || (profile.username ? `@${profile.username}` : `Instagram User ${senderId.slice(-4)}`)
    const username = profile.username || ''
    const msgText  = String(message?.text ?? '')
    const customData: Record<string, string> = { ig_signal: 'dm' }
    if (username)     customData.ig_username   = username
    if (msgText)      customData.first_message = msgText.slice(0, 500)
    if (isStoryReply) customData.is_story_reply = 'true'

    const owner = await allocateLead(supabase, orgId, new Date())
    const quota = await getQuotaState(orgId)
    if (quota.atLimit) { await checkAndAlertQuota(orgId, 0); return }

    const { data: lead, error } = await supabase.from('leads').insert({
      org_id: orgId, name, phone: null, source: 'instagram_dm', main_stage: '0',
      instagram_thread_id: senderId,
      owner_id: owner?.id ?? null, reporting_manager_id: owner?.reports_to ?? null,
      custom_data: customData, approved: true,
      sla_deadline: deadlineFor({ stage: '0', source: 'instagram_dm', slaConfig, slaConfigBySource }),
    }).select().single()

    if (error) { console.error('[Instagram DM] insert error:', error.message); return }

    await supabase.from('activities').insert({ org_id: orgId, lead_id: lead.id,
      employee_id: owner?.id ?? null, activity_type: 'lead_created',
      note: isStoryReply ? 'Lead created from Instagram Story Reply' : 'Lead created from Instagram DM' })

    revalidateTag(`admin-leads:${orgId}`, 'max')
    revalidateTag(`analytics:${orgId}`, 'max')
    bustQuotaCache(orgId)
    await checkAndAlertQuota(orgId, 1)
    console.info('[Instagram DM] lead created:', lead.id)
  } catch (err) { console.error('[Instagram DM] unexpected error:', err) }
}

// ── Comment handler ──────────────────────────────────────────
async function handleCommentEvent({ supabase, orgId, accessToken, value, signals, slaConfig, slaConfigBySource }: {
  supabase:          ReturnType<typeof createAdminClient>
  orgId:             string; accessToken: string
  value:             Record<string, unknown>; signals: IgSignals
  slaConfig:         SlaConfig | null
  slaConfigBySource: SlaConfigBySource | null
}) {
  try {
    const commentId   = String(value.id ?? '')
    const commentText = String(value.text ?? '')
    const from        = value.from as { id?: string; username?: string } | undefined
    if (!commentId) return

    // Keyword gate runs before any DB/API call
    const keywords = (signals.comments_keywords ?? []).map(k => k.toLowerCase().trim()).filter(Boolean)
    if (keywords.length > 0 && !keywords.some(k => commentText.toLowerCase().includes(k))) return

    const { data: existing } = await supabase.from('leads').select('id')
      .eq('instagram_comment_id', commentId).limit(1)
    if (existing && existing.length > 0) return

    let name = from?.username ? `@${from.username}` : 'Unknown'
    let username = from?.username || ''

    if (from?.id) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${from.id}?fields=name,username&access_token=${accessToken}`)
      const profile = await res.json() as { name?: string; username?: string }
      name     = profile.name || `@${profile.username}` || name
      username = profile.username || username
    }

    const customData: Record<string, string> = { ig_signal: 'comment', comment_text: commentText.slice(0, 500) }
    if (username) customData.ig_username = username

    const owner = await allocateLead(supabase, orgId, new Date())
    const quota = await getQuotaState(orgId)
    if (quota.atLimit) { await checkAndAlertQuota(orgId, 0); return }

    const { data: lead, error } = await supabase.from('leads').insert({
      org_id: orgId, name, phone: null, source: 'instagram_comment', main_stage: '0',
      instagram_comment_id: commentId,
      owner_id: owner?.id ?? null, reporting_manager_id: owner?.reports_to ?? null,
      custom_data: customData, approved: true,
      sla_deadline: deadlineFor({ stage: '0', source: 'instagram_comment', slaConfig, slaConfigBySource }),
    }).select().single()

    if (error) { console.error('[Instagram Comment] insert error:', error.message); return }

    await supabase.from('activities').insert({ org_id: orgId, lead_id: lead.id,
      employee_id: owner?.id ?? null, activity_type: 'lead_created',
      note: 'Lead created from Instagram Comment' })

    revalidateTag(`admin-leads:${orgId}`, 'max')
    revalidateTag(`analytics:${orgId}`, 'max')
    bustQuotaCache(orgId)
    await checkAndAlertQuota(orgId, 1)
    console.info('[Instagram Comment] lead created:', lead.id)
  } catch (err) { console.error('[Instagram Comment] unexpected error:', err) }
}

// ── Mention handler ──────────────────────────────────────────
async function handleMentionEvent({ supabase, orgId, accessToken, value, slaConfig, slaConfigBySource }: {
  supabase:          ReturnType<typeof createAdminClient>
  orgId:             string; accessToken: string; value: Record<string, unknown>
  slaConfig:         SlaConfig | null
  slaConfigBySource: SlaConfigBySource | null
}) {
  try {
    const mentionId = String(value.comment_id || value.media_id || '')
    if (!mentionId) return

    const { data: existing } = await supabase.from('leads').select('id')
      .eq('instagram_mention_id', mentionId).limit(1)
    if (existing && existing.length > 0) return

    const mentionRes = await fetch(
      `https://graph.facebook.com/v19.0/${mentionId}?fields=text,from&access_token=${accessToken}`)
    const mentionData = await mentionRes.json() as { text?: string; from?: { id?: string; username?: string }; error?: { message?: string } }
    if (mentionData.error) {
      console.warn('[Instagram Mention] fetch failed (creating lead with placeholder):',
        mentionId, mentionData.error.message)
    }

    const mentionText = String(mentionData.text ?? '')
    let   name        = mentionData.from?.username ? `@${mentionData.from.username}` : 'Unknown'
    let   username    = mentionData.from?.username || ''

    if (mentionData.from?.id) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${mentionData.from.id}?fields=name,username&access_token=${accessToken}`)
      const profile = await res.json() as { name?: string; username?: string }
      name     = profile.name || `@${profile.username}` || name
      username = profile.username || username
    }

    const customData: Record<string, string> = { ig_signal: 'mention' }
    if (username)    customData.ig_username  = username
    if (mentionText) customData.mention_text = mentionText.slice(0, 500)

    const owner = await allocateLead(supabase, orgId, new Date())
    const quota = await getQuotaState(orgId)
    if (quota.atLimit) { await checkAndAlertQuota(orgId, 0); return }

    const { data: lead, error } = await supabase.from('leads').insert({
      org_id: orgId, name, phone: null, source: 'instagram_mention', main_stage: '0',
      instagram_mention_id: mentionId,
      owner_id: owner?.id ?? null, reporting_manager_id: owner?.reports_to ?? null,
      custom_data: customData, approved: true,
      sla_deadline: deadlineFor({ stage: '0', source: 'instagram_mention', slaConfig, slaConfigBySource }),
    }).select().single()

    if (error) { console.error('[Instagram Mention] insert error:', error.message); return }

    await supabase.from('activities').insert({ org_id: orgId, lead_id: lead.id,
      employee_id: owner?.id ?? null, activity_type: 'lead_created',
      note: 'Lead created from Instagram Mention' })

    revalidateTag(`admin-leads:${orgId}`, 'max')
    revalidateTag(`analytics:${orgId}`, 'max')
    bustQuotaCache(orgId)
    await checkAndAlertQuota(orgId, 1)
    console.info('[Instagram Mention] lead created:', lead.id)
  } catch (err) { console.error('[Instagram Mention] unexpected error:', err) }
}

// ── Types ─────────────────────────────────────────────────────
interface IgSignals {
  dms_enabled?:       boolean
  comments_enabled?:  boolean
  comments_keywords?: string[]
  mentions_enabled?:  boolean
}
interface IgConfig {
  ig_account_id?:   string
  access_token?:    string
  capi_dataset_id?: string
  signals?:         IgSignals
}

// ── Weighted lead allocation ──────────────────────────────────
async function allocateLead(supabase: ReturnType<typeof createAdminClient>, orgId: string, date: Date) {
  const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()]
  const dateStr   = date.toISOString().slice(0, 10)

  const { data: orgRoles } = await supabase.from('org_roles').select('key, level')
    .eq('org_id', orgId).eq('can_access_admin', false).order('level', { ascending: false })

  const roleTiers = orgRoles && orgRoles.length > 0
    ? orgRoles.map(r => r.key) : ['tl', 'counsellor', 'telesales']

  const { data: employees } = await supabase.from('employees').select('id, role, score, reports_to')
    .eq('org_id', orgId).in('role', roleTiers)
    .eq('is_active', true).eq('is_on_leave', false).eq('auto_allocate', true)

  if (!employees || employees.length === 0) return null

  const { data: weekoffs } = await supabase.from('weekoffs').select('employee_id')
    .eq('org_id', orgId).or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${dateStr}`)

  const weekoffIds = new Set((weekoffs || []).map(w => w.employee_id))
  const available  = employees.filter(e => !weekoffIds.has(e.id) && (e.score ?? 1) > 0)
  if (available.length === 0) return null

  for (const role of roleTiers) {
    const tier = available.filter(e => e.role === role)
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
