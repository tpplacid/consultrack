import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabase.from('employees').select('role, org_id').eq('email', user.email!).single()
  if (!admin || admin.role !== 'ad') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lead_ids, signal } = await req.json()
  if (!lead_ids || lead_ids.length === 0) return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
  if (!signal || !['BAD', 'QUALIFIED'].includes(signal)) return NextResponse.json({ error: 'signal must be BAD or QUALIFIED' }, { status: 400 })

  // Resolve the IG CAPI dataset ID — per-org config first, then global env
  const adminClient = createAdminClient()
  const { data: orgData } = await adminClient
    .from('orgs')
    .select('instagram_config')
    .eq('id', admin.org_id)
    .single()

  const igConfig   = (orgData?.instagram_config ?? {}) as Record<string, string>
  const datasetId  = igConfig.capi_dataset_id || process.env.INSTAGRAM_CAPI_DATASET_ID || ''

  if (!datasetId) return NextResponse.json({ error: 'No Instagram CAPI dataset configured' }, { status: 400 })

  const capiToken = igConfig.capi_token || process.env.INSTAGRAM_CAPI_TOKEN || process.env.META_CAPI_TOKEN || ''
  if (!capiToken) return NextResponse.json({ error: 'No CAPI token configured' }, { status: 400 })

  const { data: leads } = await adminClient
    .from('leads')
    .select('phone, instagram_lead_id')
    .in('id', lead_ids)
    .eq('source', 'instagram')

  if (!leads || leads.length === 0) return NextResponse.json({ error: 'No Instagram leads found' }, { status: 404 })

  const now    = Math.floor(Date.now() / 1000)
  const events = leads.map(l => ({
    event_name: signal,
    event_time: now,
    user_data: {
      ph: [createHash('sha256').update(l.phone.replace(/\D/g, '')).digest('hex')],
    },
    ...(l.instagram_lead_id ? { custom_data: { lead_id: l.instagram_lead_id } } : {}),
  }))

  const capiRes = await fetch(
    `https://graph.facebook.com/v19.0/${datasetId}/events`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: events, access_token: capiToken }),
    }
  )

  const capiData = await capiRes.json()
  if (capiData.error) return NextResponse.json({ error: capiData.error.message }, { status: 400 })

  return NextResponse.json({ success: true, events_received: capiData.events_received ?? events.length, signal })
}
