'use client'

import { useState } from 'react'
import { Employee, Leave } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Calendar } from 'lucide-react'

interface Props { employee: Employee; leaves: Leave[] }

export function LeavesClient({ employee, leaves: initialLeaves }: Props) {
  const [leaves, setLeaves] = useState(initialLeaves)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ leave_date: '', leave_type: 'casual' as Leave['leave_type'], reason: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.leave_date) return toast.error('Select a date')
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('leaves').insert({
      org_id: employee.org_id,
      employee_id: employee.id,
      leave_date: form.leave_date,
      leave_type: form.leave_type,
      reason: form.reason,
      status: 'pending',
    }).select().single()
    if (error) toast.error(error.message)
    else { setLeaves(prev => [data, ...prev]); toast.success('Leave applied'); setOpen(false) }
    setLoading(false)
  }

  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Leaves</h1>
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={15} />Apply Leave</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>My Leave Requests</CardTitle></CardHeader>
        <div className="divide-y divide-slate-100">
          {leaves.length === 0 ? (
            <p className="p-5 text-sm text-slate-400 text-center">No leave requests</p>
          ) : leaves.map(l => (
            <div key={l.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-800">{formatDate(l.leave_date)}</span>
                  <span className="text-xs text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded">{l.leave_type}</span>
                </div>
                {l.reason && <p className="text-xs text-slate-500 mt-1">{l.reason}</p>}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${statusColors[l.status]}`}>{l.status}</span>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Apply for Leave">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Leave Date</label>
            <input type="date" required value={form.leave_date} onChange={e => setForm(p => ({...p, leave_date: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Leave Type</label>
            <select value={form.leave_type} onChange={e => setForm(p => ({...p, leave_type: e.target.value as Leave['leave_type']}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Reason</label>
            <textarea value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Optional reason…" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Submit</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
