import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

const DATASET_ID = '919595384231137'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabase.from('employees').select('role').eq('email', user.email!).single()
  if (!admin || admin.role !== 'ad') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lead_ids, signal } = await req.json()
  if (!lead_ids || lead_ids.length === 0) return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
  if (!signal || !['BAD', 'QUALIFIED'].includes(signal)) return NextResponse.json({ error: 'signal must be BAD or QUALIFIED' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: leads } = await adminClient.from('leads').select('phone, meta_lead_id').in('id', lead_ids)
  if (!leads || leads.length === 0) return NextResponse.json({ error: 'Leads not found' }, { status: 404 })

  const now = Math.floor(Date.now() / 1000)
  const events = leads.map(l => ({
    event_name: signal,
    event_time: now,
    user_data: {
      ph: [createHash('sha256').update(l.phone.replace(/\D/g, '')).digest('hex')],
    },
    ...(l.meta_lead_id ? { custom_data: { lead_id: l.meta_lead_id } } : {}),
  }))

  const capiRes = await fetch(
    `https://graph.facebook.com/v19.0/${DATASET_ID}/events`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: events,
        access_token: process.env.META_CAPI_TOKEN,
      }),
    }
  )

  const capiData = await capiRes.json()
  if (capiData.error) return NextResponse.json({ error: capiData.error.message }, { status: 400 })

  return NextResponse.json({ success: true, events_received: capiData.events_received ?? events.length, signal })
}
