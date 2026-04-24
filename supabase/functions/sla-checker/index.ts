// Supabase Edge Function — runs on a cron schedule (every hour)
// Deploy: supabase functions deploy sla-checker
// Schedule: supabase functions schedule sla-checker --cron "0 * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ENGAGELO_API_KEY = Deno.env.get('ENGAGELO_API_KEY')
const ENGAGELO_API_URL = Deno.env.get('ENGAGELO_API_URL')

Deno.serve(async () => {
  const now = new Date().toISOString()
  const results: string[] = []

  try {
    // ── 1. Find leads with overdue SLA ────────────────────────────
    const { data: overdueLeads, error: overdueError } = await supabase
      .from('leads')
      .select('id, org_id, main_stage, owner_id, reporting_manager_id, sla_deadline')
      .not('main_stage', 'in', '("E","F","G","X","Y")')
      .not('sla_deadline', 'is', null)
      .lt('sla_deadline', now)
      .eq('approved', true)

    if (overdueError) throw overdueError

    for (const lead of overdueLeads || []) {
      // Check if breach already recorded
      const { data: existing } = await supabase
        .from('sla_breaches')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('stage', lead.main_stage)
        .limit(1)

      if (existing && existing.length > 0) continue

      // Insert breach record
      const { error: breachError } = await supabase
        .from('sla_breaches')
        .insert({
          org_id: lead.org_id,
          lead_id: lead.id,
          owner_id: lead.owner_id,
          stage: lead.main_stage,
          breached_at: now,
          resolution: 'pending',
        })

      if (breachError) {
        results.push(`Breach insert error for lead ${lead.id}: ${breachError.message}`)
        continue
      }

      results.push(`Breach recorded: lead=${lead.id} stage=${lead.main_stage}`)
    }

    // ── 2. 10-day rule: Stage B leads stuck for > 10 days ────────
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

    const { data: stuckLeads } = await supabase
      .from('leads')
      .select('id, org_id, name, phone, owner_id')
      .eq('main_stage', 'B')
      .lt('stage_entered_at', tenDaysAgo)
      .eq('approved', true)

    if (stuckLeads && stuckLeads.length > 0 && ENGAGELO_API_KEY && ENGAGELO_API_URL) {
      // Get AD email per org
      const orgIds = [...new Set(stuckLeads.map(l => l.org_id))]
      for (const orgId of orgIds) {
        const orgLeads = stuckLeads.filter(l => l.org_id === orgId)
        const phones = orgLeads.map(l => l.phone.replace(/\D/g, ''))
        const names = orgLeads.map(l => l.name).join(', ')

        // Send bulk WA via Engagelo
        try {
          await fetch(`${ENGAGELO_API_URL}/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ENGAGELO_API_KEY}`,
            },
            body: JSON.stringify({
              recipients: phones.map(p => ({ phone: p })),
              message: `Hi, this is AdmiShine. We wanted to follow up on your college admissions enquiry. Our team is ready to assist you. Please call us back at your convenience.`,
            }),
          })
          results.push(`Bulk WA sent to ${phones.length} stuck-B leads in org ${orgId}`)
        } catch (e) {
          results.push(`Engagelo error for org ${orgId}: ${e}`)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
