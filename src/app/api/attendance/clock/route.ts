import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  const employee = await requireAuth()
  const body = await req.json()
  const { action, wifiCode, overrideReason, requireKey } = body

  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayDayName = format(new Date(), 'EEEE').toLowerCase()

  // Block clock-in (not clock-out) during weekoffs or approved leaves
  if (action === 'clock_in' || action === 'override') {
    const [{ data: weekoffRows }, { data: leaveRows }] = await Promise.all([
      supabase
        .from('weekoffs')
        .select('id')
        .eq('employee_id', employee.id)
        .or(`day_of_week.eq.${todayDayName},specific_date.eq.${today}`)
        .limit(1),
      supabase
        .from('leaves')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .limit(1),
    ])
    if ((weekoffRows?.length ?? 0) > 0) {
      return NextResponse.json({ error: 'Today is your week off — clock-in is not allowed.' }, { status: 403 })
    }
    if ((leaveRows?.length ?? 0) > 0) {
      return NextResponse.json({ error: 'You are on approved leave today — clock-in is not allowed.' }, { status: 403 })
    }
  }

  const wifiVerified = !requireKey
    ? true
    : employee.wifi_ssid
      ? wifiCode?.trim()?.toLowerCase() === employee.wifi_ssid.toLowerCase()
      : false

  const isManualOverride = action === 'override'

  const finalStatus = !requireKey
    ? 'present'
    : isManualOverride
      ? 'questioned'
      : wifiVerified
        ? 'present'
        : 'questioned'

  if (action === 'clock_in' || action === 'override') {
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        org_id: employee.org_id,
        employee_id: employee.id,
        work_date: today,
        clock_in: now,
        wifi_verified: wifiVerified,
        manual_override: isManualOverride,
        override_reason: isManualOverride ? overrideReason : null,
        status: finalStatus,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ record: data, wifiVerified, requireKey })
  }

  if (action === 'clock_out') {
    const { recordId } = body
    const { data, error } = await supabase
      .from('attendance')
      .update({ clock_out: now })
      .eq('id', recordId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ record: data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
