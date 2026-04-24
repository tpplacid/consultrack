'use client'

import { useState } from 'react'
import { Employee, Attendance } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, HelpCircle, Wifi, WifiOff, KeyRound } from 'lucide-react'

interface Props {
  admin: Employee
  records: Attendance[]
  orgId: string
  requireKey: boolean
}

export function AdminAttendanceClient({ admin, records: initialRecords, orgId, requireKey: initialRequireKey }: Props) {
  const [records, setRecords] = useState(initialRecords)
  const [noteModal, setNoteModal] = useState<Attendance | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [requireKey, setRequireKey] = useState(initialRequireKey)
  const [toggling, setToggling] = useState(false)

  async function toggleAttendanceKey() {
    setToggling(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('orgs')
      .update({ require_attendance_key: !requireKey })
      .eq('id', orgId)
    if (error) toast.error(error.message)
    else {
      setRequireKey(prev => !prev)
      toast.success(!requireKey ? 'Attendance key requirement enabled' : 'Attendance key requirement disabled')
    }
    setToggling(false)
  }

  async function updateStatus(record: Attendance, status: Attendance['status'], note?: string) {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('attendance')
      .update({
        status,
        admin_note: note || record.admin_note,
        override_approved_by: status === 'present' ? admin.id : undefined,
      })
      .eq('id', record.id)
      .select().single()
    if (error) toast.error(error.message)
    else {
      setRecords(prev => prev.map(r => r.id === data.id ? { ...data, employee: r.employee } : r))
      toast.success(`Marked as ${status}`)
    }
    setLoading(false)
    setNoteModal(null)
  }

  const questioned = records.filter(r => r.status === 'questioned')
  const others = records.filter(r => r.status !== 'questioned')

  const statusIcon = {
    present: <CheckCircle size={14} className="text-green-500" />,
    absent: <XCircle size={14} className="text-red-500" />,
    half_day: <HelpCircle size={14} className="text-yellow-500" />,
    questioned: <HelpCircle size={14} className="text-orange-500" />,
    rejected: <XCircle size={14} className="text-red-500" />,
  }

  function RecordRow({ r }: { r: Attendance }) {
    const emp = r.employee as Employee
    return (
      <tr className={r.status === 'questioned' ? 'bg-orange-50' : 'hover:bg-slate-50'}>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-800 text-sm">{emp?.name || '—'}</p>
          <p className="text-xs text-slate-500">{emp?.role ? (emp.role === "tl" ? "TL" : emp.role === "ad" ? "AD" : emp.role.charAt(0).toUpperCase() + emp.role.slice(1)) : ""}</p>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.work_date)}</td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {r.clock_in ? formatDateTime(r.clock_in) : '—'}
          {r.clock_out && <span className="text-slate-400"> → {formatDateTime(r.clock_out)}</span>}
        </td>
        <td className="px-4 py-3">
          <span title={r.wifi_verified ? 'WiFi verified' : 'Not verified'}>
            {r.wifi_verified ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-400" />}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">{statusIcon[r.status]}<span className="text-xs capitalize text-slate-600">{r.status}</span></div>
          {r.override_reason && <p className="text-xs text-orange-600 mt-0.5">{r.override_reason}</p>}
        </td>
        <td className="px-4 py-3">
          {r.status === 'questioned' && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => updateStatus(r, 'present')}>Approve</Button>
              <Button size="sm" variant="danger" onClick={() => updateStatus(r, 'rejected')}>Reject</Button>
              <Button size="sm" variant="outline" onClick={() => { setNoteModal(r); setAdminNote(r.admin_note || '') }}>Note</Button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">Attendance Management</h1>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${requireKey ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'}`}>
          <KeyRound size={16} className={requireKey ? 'text-slate-500' : 'text-indigo-600'} />
          <div>
            <p className="text-xs font-semibold text-slate-700">Attendance Key</p>
            <p className={`text-xs ${requireKey ? 'text-slate-500' : 'text-indigo-600 font-medium'}`}>
              {requireKey ? 'Required for all staff' : 'Disabled — key-free clock-in'}
            </p>
          </div>
          <Button
            size="sm"
            variant={requireKey ? 'danger' : 'secondary'}
            loading={toggling}
            onClick={toggleAttendanceKey}
          >
            {requireKey ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {questioned.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 mb-1">⚠️ {questioned.length} entries need review</p>
          <p className="text-xs text-orange-600">These are manual overrides or questioned entries requiring approval.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">WiFi</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {questioned.map(r => <RecordRow key={r.id} r={r} />)}
            {others.slice(0, 100).map(r => <RecordRow key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>

      <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="Add Admin Note">
        <div className="p-5 space-y-4">
          <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Admin note…" />
          <Button className="w-full" loading={loading} onClick={() => noteModal && updateStatus(noteModal, noteModal.status, adminNote)}>Save Note</Button>
        </div>
      </Modal>
    </div>
  )
}
