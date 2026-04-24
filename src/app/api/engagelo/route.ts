import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabase.from('employees').select('role').eq('email', user.email!).single()
  if (!admin || admin.role !== 'ad') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { phones, message } = await req.json()
  if (!phones || phones.length === 0 || !message) {
    return NextResponse.json({ error: 'phones and message required' }, { status: 400 })
  }

  const apiKey = process.env.ENGAGELO_API_KEY
  const apiUrl = process.env.ENGAGELO_API_URL

  if (!apiKey || !apiUrl) {
    return NextResponse.json({ error: 'Engagelo API not configured' }, { status: 500 })
  }

  // Call Engagelo bulk WhatsApp API
  const res = await fetch(`${apiUrl}/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      recipients: phones.map((p: string) => ({ phone: p.replace(/\D/g, '') })),
      message,
    }),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.error || 'Engagelo error' }, { status: 400 })

  return NextResponse.json({ success: true, sent: phones.length, response: data })
}
