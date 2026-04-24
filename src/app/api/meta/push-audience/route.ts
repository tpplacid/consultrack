import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabase.from('employees').select('role').eq('email', user.email!).single()
  if (!admin || admin.role !== 'ad') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lead_ids, audience_id } = await req.json()
  if (!lead_ids || lead_ids.length === 0) return NextResponse.json({ error: 'No leads provided' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: leads } = await adminClient.from('leads').select('phone').in('id', lead_ids)
  if (!leads || leads.length === 0) return NextResponse.json({ error: 'Leads not found' }, { status: 404 })

  // Hash phone numbers (Meta requires SHA-256 hashed data)
  const phones = leads.map(l => l.phone.replace(/\D/g, ''))
  const { createHash } = await import('crypto')
  const hashedPhones = phones.map(p => createHash('sha256').update(p).digest('hex'))

  // Add to Meta Custom Audience
  const adAccountId = process.env.META_AD_ACCOUNT_ID
  const accessToken = process.env.META_ACCESS_TOKEN
  const audienceId = audience_id || process.env.META_CUSTOM_AUDIENCE_ID

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${audienceId}/users`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: {
          schema: ['PHONE'],
          data: hashedPhones.map(h => [h]),
        },
        access_token: accessToken,
      }),
    }
  )

  const metaData = await metaRes.json()
  if (metaData.error) return NextResponse.json({ error: metaData.error.message }, { status: 400 })

  return NextResponse.json({ success: true, num_received: metaData.num_received, audience_id: audienceId })
}
