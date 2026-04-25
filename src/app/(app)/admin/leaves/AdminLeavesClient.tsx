'use client'

import { useState } from 'react'
import { Employee, Leave } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props { admin: Employee; leaves: Leave[] }

export function AdminLeavesClient({ admin, leaves: initialLeaves }: Props) {
  const [leaves, setLeaves] = useState(initialLeaves)
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(leave: Leave, status: 'approved' | 'rejected') {
    setLoading(leave.id)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leaves')
      .update({ status, approved_by: admin.id })
      .eq('id', leave.id)
      .select().single()

    if (error) toast.error(error.message)
    else {
      if (status === 'approved' && leave.leave_type === 'emergency') {
        await supabase.from('employees').update({ is_on_leave: true }).eq('id', leave.employee_id)
      }
      setLeaves(prev => prev.map(l => l.id === data.id ? { ...data, employee: l.employee } : l))
      toast.success(`Leave ${status}`)
    }
    setLoading(null)
  }

  const pending = leaves.filter(l => l.status === 'pending')
  const others = leaves.filter(l => l.status !== 'pending')
  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Leave Management</h1>

      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-yellow-800">{pending.length} pending leave requests</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Reason</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...pending, ...others].map(l => {
              const emp = l.employee as Employee
              return (
                <tr key={l.id} className={l.status === 'pending' ? 'bg-yellow-50' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm text-slate-900">{emp?.name}</p>
                    <p className="text-xs text-slate-500">{emp?.role ? (emp.role === "tl" ? "TL" : emp.role === "ad" ? "AD" : emp.role.charAt(0).toUpperCase() + emp.role.slice(1)) : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(l.leave_date)}</td>
                  <td className="px-4 py-3 text-sm capitalize text-slate-600">{l.leave_type}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{l.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${statusColors[l.status]}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {l.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" loading={loading === l.id} onClick={() => updateStatus(l, 'approved')}>
                          <CheckCircle size={12} />Approve
                        </Button>
                        <Button size="sm" variant="danger" loading={loading === l.id} onClick={() => updateStatus(l, 'rejected')}>
                          <XCircle size={12} />Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {leaves.length === 0 && <p className="py-8 text-center text-slate-400">No leave requests</p>}
      </div>
    </div>
  )
}
