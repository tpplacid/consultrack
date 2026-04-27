'use client'

import { useState } from 'react'
import { Employee, Attendance } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Clock, Wifi, WifiOff, LogIn, LogOut, KeyRound, CalendarOff, UmbrellaOff } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  employee: Employee
  records: Attendance[]
  requireKey: boolean
  isWeekoff?: boolean
  isOnLeave?: boolean
}

export function AttendanceClient({ employee, records: initialRecords, requireKey, isWeekoff = false, isOnLeave = false }: Props) {
  const [records, setRecords] = useState(initialRecords)
  const [loading, setLoading] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [wifiCode, setWifiCode] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')

  // Newest-first so lastRecord is always the most recent session
  const todayRecords = records
    .filter(r => r.work_date === today)
    .sort((a, b) => new Date(b.clock_in || b.created_at).getTime() - new Date(a.clock_in || a.created_at).getTime())

  const lastRecord = todayRecords[0]
  const isClockedIn = !!(lastRecord?.clock_in && !lastRecord?.clock_out)

  async function handleClockAction(isManualOverride = false) {
    setLoading(true)
    try {
      const body = isClockedIn
        ? { action: 'clock_out', recordId: lastRecord.id }
        : isManualOverride
          ? { action: 'override', overrideReason, requireKey }
          : { action: 'clock_in', wifiCode, requireKey }

      const res = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Failed')
      } else {
        const { record, wifiVerified } = json
        // Upsert: replace existing row if same id, otherwise prepend
        setRecords(prev => {
          const without = prev.filter(r => r.id !== record.id)
          return [record, ...without]
        })
        if (isClockedIn) {
          toast.success('Clocked out')
        } else {
          toast.success(
            !requireKey
              ? 'Clocked in'
              : wifiVerified
                ? 'Clocked in (WiFi verified)'
                : 'Clocked in (WiFi not verified)'
          )
        }
        setOverrideOpen(false)
        setWifiCode('')
        setOverrideReason('')
      }
    } catch {
      toast.error('Network error')
    }
    setLoading(false)
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
        <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          <KeyRound size={14} />
          Attendance key requirement is currently disabled — clock in without a code.
        </div>
      )}

      {isWeekoff && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <CalendarOff size={14} />
          Today is your week off — clock-in is not available.
        </div>
      )}

      {isOnLeave && !isWeekoff && (
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <UmbrellaOff size={14} />
          You&apos;re on approved leave today — clock-in is not available.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Today — {formatDate(today)}</p>
              <p className={`text-xs mt-0.5 font-medium ${
                isWeekoff ? 'text-amber-600'
                : isOnLeave ? 'text-blue-600'
                : isClockedIn ? 'text-green-600'
                : 'text-slate-500'
              }`}>
                {isWeekoff ? '✦ Week off'
                  : isOnLeave ? '✦ On approved leave'
                  : isClockedIn ? '● Currently clocked in'
                  : '○ Not clocked in'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isWeekoff ? 'bg-amber-100'
              : isOnLeave ? 'bg-blue-100'
              : isClockedIn ? 'bg-green-100'
              : 'bg-slate-100'
            }`}>
              <Clock size={22} className={
                isWeekoff ? 'text-amber-500'
                : isOnLeave ? 'text-blue-500'
                : isClockedIn ? 'text-green-600'
                : 'text-slate-400'
              } />
            </div>
          </div>

          {!isClockedIn && !isWeekoff && !isOnLeave && requireKey && (
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

          {(isWeekoff || isOnLeave) ? (
            <Button variant="outline" className="flex-1 w-full opacity-50 cursor-not-allowed" disabled>
              <Clock size={15} />Clock-in disabled
            </Button>
          ) : (
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
          )}

          {todayRecords.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500">Today&apos;s sessions</p>
              {todayRecords.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.wifi_verified ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-400" />}
                    <span>{r.clock_in ? formatDateTime(r.clock_in) : '—'}</span>
                    <span className="text-slate-400">→</span>
                    <span>{r.clock_out ? formatDateTime(r.clock_out) : 'Active'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusColors[r.status] || ''}`}>
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
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{formatDate(r.work_date)}</p>
                <p className="text-xs text-slate-500 truncate">
                  {r.clock_in ? formatDateTime(r.clock_in) : '—'} → {r.clock_out ? formatDateTime(r.clock_out) : '—'}
                </p>
                {r.override_reason && <p className="text-xs text-orange-600 mt-0.5 truncate">Override: {r.override_reason}</p>}
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${statusColors[r.status] || 'bg-slate-50 text-slate-600'}`}>
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
