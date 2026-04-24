'use client'

import { useState } from 'react'
import { Employee, Attendance } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Clock, Wifi, WifiOff, LogIn, LogOut, KeyRound } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  employee: Employee
  records: Attendance[]
  requireKey: boolean
}

export function AttendanceClient({ employee, records: initialRecords, requireKey }: Props) {
  const [records, setRecords] = useState(initialRecords)
  const [loading, setLoading] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [wifiCode, setWifiCode] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayRecords = records.filter(r => r.work_date === today)
  const lastRecord = todayRecords[todayRecords.length - 1]
  const isClockedIn = lastRecord?.clock_in && !lastRecord?.clock_out

  async function handleClockAction(isManualOverride = false) {
    setLoading(true)
    const supabase = createClient()
    const now = new Date().toISOString()

    const wifiVerified = !requireKey
      ? true
      : employee.wifi_ssid
        ? wifiCode.trim().toLowerCase() === employee.wifi_ssid.toLowerCase()
        : false

    const finalStatus = !requireKey
      ? 'present'
      : isManualOverride
        ? 'questioned'
        : wifiVerified
          ? 'present'
          : 'questioned'

    if (!isClockedIn) {
      const { data, error } = await supabase.from('attendance').insert({
        org_id: employee.org_id,
        employee_id: employee.id,
        work_date: today,
        clock_in: now,
        wifi_verified: wifiVerified,
        manual_override: isManualOverride,
        override_reason: isManualOverride ? overrideReason : null,
        status: finalStatus,
      }).select().single()

      if (error) toast.error(error.message)
      else {
        setRecords(prev => [data, ...prev])
        toast.success(
          !requireKey
            ? 'Clocked in'
            : wifiVerified
              ? 'Clocked in (WiFi verified)'
              : 'Clocked in (WiFi not verified)'
        )
      }
    } else {
      const { data, error } = await supabase
        .from('attendance')
        .update({ clock_out: now })
        .eq('id', lastRecord.id)
        .select().single()

      if (error) toast.error(error.message)
      else {
        setRecords(prev => prev.map(r => r.id === data.id ? data : r))
        toast.success('Clocked out')
      }
    }

    setLoading(false)
    setOverrideOpen(false)
    setWifiCode('')
    setOverrideReason('')
  }

  const statusColors: Record<string, string> = {
    present: 'text-green-600 bg-green-50',
    absent: 'text-red-600 bg-red-50',
    half_day: 'text-yellow-600 bg-yellow-50',
    questioned: 'text-orange-600 bg-orange-50',
    rejected: 'text-red-600 bg-red-50',
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Attendance</h1>

      {!requireKey && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <KeyRound size={14} />
          Attendance key requirement is currently disabled — clock in without a code.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Today — {formatDate(today)}</p>
              <p className={`text-xs mt-0.5 font-medium ${isClockedIn ? 'text-green-600' : 'text-slate-500'}`}>
                {isClockedIn ? '● Currently clocked in' : '○ Not clocked in'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isClockedIn ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Clock size={22} className={isClockedIn ? 'text-green-600' : 'text-slate-400'} />
            </div>
          </div>

          {!isClockedIn && requireKey && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                WiFi Check-in Code
                <span className="text-slate-400 font-normal ml-1">(enter today&apos;s office WiFi code)</span>
              </label>
              <input
                value={wifiCode}
                onChange={e => setWifiCode(e.target.value)}
                placeholder="e.g. ADMISHINE_OFFICE"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => handleClockAction(false)}
              loading={loading}
              variant={isClockedIn ? 'danger' : 'primary'}
              className="flex-1"
            >
              {isClockedIn ? <><LogOut size={15} />Clock Out</> : <><LogIn size={15} />Clock In</>}
            </Button>
            {!isClockedIn && requireKey && (
              <Button variant="outline" onClick={() => setOverrideOpen(true)}>
                Override
              </Button>
            )}
          </div>

          {todayRecords.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500">Today&apos;s sessions</p>
              {todayRecords.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    {r.wifi_verified ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-400" />}
                    <span>{r.clock_in ? formatDateTime(r.clock_in) : '—'}</span>
                    <span className="text-slate-400">→</span>
                    <span>{r.clock_out ? formatDateTime(r.clock_out) : 'Active'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[r.status] || ''}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Attendance History (Last 30 days)</CardTitle></CardHeader>
        <div className="divide-y divide-slate-100">
          {records.filter(r => r.work_date !== today).slice(0, 25).map(r => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{formatDate(r.work_date)}</p>
                <p className="text-xs text-slate-500">
                  {r.clock_in ? formatDateTime(r.clock_in) : '—'} → {r.clock_out ? formatDateTime(r.clock_out) : '—'}
                </p>
                {r.override_reason && <p className="text-xs text-orange-600 mt-0.5">Override: {r.override_reason}</p>}
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[r.status] || 'bg-slate-50 text-slate-600'}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={overrideOpen} onClose={() => setOverrideOpen(false)} title="Manual Override">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">Clock in without WiFi verification. Your entry will be marked as <strong>questioned</strong> and reviewed by admin.</p>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Reason</label>
            <textarea
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain why you can't verify WiFi…"
            />
          </div>
          <Button className="w-full" onClick={() => handleClockAction(true)} loading={loading} disabled={!overrideReason.trim()}>
            Submit Override Request
          </Button>
        </div>
      </Modal>
    </div>
  )
}
