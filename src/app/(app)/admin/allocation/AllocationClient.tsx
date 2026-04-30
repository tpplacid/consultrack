'use client'

import { useState } from 'react'
import { Employee, Weekoff } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { OrgTree } from '@/components/OrgTree'
import toast from 'react-hot-toast'
import { Plus, Trash2, Calendar } from 'lucide-react'

interface Props {
  admin: Employee
  employees: Employee[]
  weekoffs: Weekoff[]
  leadCounts: Record<string, number>
  activityCounts: Record<string, number>
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export function AllocationClient({ admin, employees: initialEmployees, weekoffs: initialWeekoffs, leadCounts, activityCounts }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [weekoffs, setWeekoffs] = useState(initialWeekoffs)
  const [weekoffModal, setWeekoffModal] = useState(false)
  const [woForm, setWoForm] = useState({ employee_id: '', day_of_week: '', specific_date: '' })
  const [loading, setLoading] = useState(false)

  async function addWeekoff() {
    if (!woForm.employee_id || (!woForm.day_of_week && !woForm.specific_date)) {
      return toast.error('Select employee and day or date')
    }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('weekoffs').insert({
      org_id: admin.org_id,
      employee_id: woForm.employee_id,
      day_of_week: woForm.day_of_week || null,
      specific_date: woForm.specific_date || null,
      created_by: admin.id,
    }).select().single()
    if (error) toast.error(error.message)
    else {
      setWeekoffs(prev => [...prev, data])
      toast.success('Weekoff added')
      setWeekoffModal(false)
      setWoForm({ employee_id: '', day_of_week: '', specific_date: '' })
    }
    setLoading(false)
  }

  async function removeWeekoff(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('weekoffs').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setWeekoffs(prev => prev.filter(w => w.id !== id)); toast.success('Removed') }
  }

  function handleScoreUpdate(id: string, score: number) {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, score } : e))
  }

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || id

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-slate-900">Allocation & Org Tree</h1>

      {/* Org Tree */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Organisation Chart</h2>
        <p className="text-xs text-slate-500">Click a score to edit inline. Red nodes have &lt;2 activities today.</p>
        <OrgTree
          employees={employees}
          leadCounts={leadCounts}
          activityCounts={activityCounts}
          onScoreUpdate={handleScoreUpdate}
        />
      </div>

      {/* Auto Allocation */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Auto Allocation</h2>
          <p className="text-xs text-slate-500 mt-0.5">Employees with auto allocation off will not receive leads from Meta or bulk upload. Manual transfer still works.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Auto Allocate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{emp.name}</span>
                    <span className="ml-2 text-xs text-slate-400 uppercase">{emp.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        const newValue = !(emp.auto_allocate ?? true)
                        const supabase = createClient()
                        const { error } = await supabase
                          .from('employees')
                          .update({ auto_allocate: newValue })
                          .eq('id', emp.id)
                        if (error) toast.error(error.message)
                        else setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, auto_allocate: newValue } : e))
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${(emp.auto_allocate ?? true) ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${(emp.auto_allocate ?? true) ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekoff Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Weekoff Management</h2>
          <Button size="sm" onClick={() => setWeekoffModal(true)}>
            <Plus size={14} />
            Add Weekoff
          </Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          {weekoffs.length === 0 ? (
            <p className="p-5 text-sm text-slate-400 text-center">No weekoffs configured</p>
          ) : (
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Day</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Specific Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weekoffs.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{getEmployeeName(w.employee_id)}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{w.day_of_week || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{w.specific_date || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeWeekoff(w.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Weekoff Modal */}
      <Modal open={weekoffModal} onClose={() => setWeekoffModal(false)} title="Add Weekoff">
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Employee</label>
            <select
              value={woForm.employee_id}
              onChange={e => setWoForm(p => ({...p, employee_id: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select employee…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Recurring Day Off</label>
            <select
              value={woForm.day_of_week}
              onChange={e => setWoForm(p => ({...p, day_of_week: e.target.value, specific_date: ''}))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No recurring day</option>
              {DAYS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
            </select>
          </div>

          <div className="text-center text-xs text-slate-400">— OR —</div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Specific Date (one-time)</label>
            <input
              type="date"
              value={woForm.specific_date}
              onChange={e => setWoForm(p => ({...p, specific_date: e.target.value, day_of_week: ''}))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setWeekoffModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={addWeekoff}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
