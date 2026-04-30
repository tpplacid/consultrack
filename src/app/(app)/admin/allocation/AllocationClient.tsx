'use client'

import { useState } from 'react'
import { Employee, Weekoff } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  admin: Employee
  employees: Employee[]
  weekoffs: Weekoff[]
  leadCounts: Record<string, number>
  activityCounts: Record<string, number>
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const ROLE_ORDER: Record<string, number> = { ad: 0, tl: 1, counsellor: 2, telesales: 3 }
const ROLE_COLORS: Record<string, string> = {
  ad:        'bg-brand-100 text-brand-700',
  tl:        'bg-indigo-100 text-indigo-700',
  counsellor:'bg-emerald-100 text-emerald-700',
  telesales: 'bg-amber-100 text-amber-700',
}

export function AllocationClient({ admin, employees: initialEmployees, weekoffs: initialWeekoffs, leadCounts, activityCounts }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [weekoffs, setWeekoffs]   = useState(initialWeekoffs)
  const [weekoffModal, setWeekoffModal] = useState(false)
  const [woForm, setWoForm]       = useState({ employee_id: '', day_of_week: '', specific_date: '' })
  const [woLoading, setWoLoading] = useState(false)
  const [editScore, setEditScore] = useState<Record<string, string>>({})
  const [savingScore, setSavingScore] = useState<string | null>(null)

  const nameMap = Object.fromEntries(employees.map(e => [e.id, e.name]))

  const sorted = [...employees].sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name)
  )

  // ── Score ────────────────────────────────────────────────────────────────────
  async function saveScore(emp: Employee) {
    const raw = editScore[emp.id]
    const val = parseInt(raw ?? '')
    if (isNaN(val) || val < 0 || val > 10) return toast.error('Score must be 0–10')
    setSavingScore(emp.id)
    const supabase = createClient()
    const { error } = await supabase.from('employees').update({ score: val }).eq('id', emp.id)
    if (error) toast.error(error.message)
    else {
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, score: val } : e))
      setEditScore(prev => { const n = { ...prev }; delete n[emp.id]; return n })
      toast.success('Score updated')
    }
    setSavingScore(null)
  }

  // ── Auto allocate ─────────────────────────────────────────────────────────────
  async function toggleAutoAllocate(emp: Employee) {
    const newVal = !(emp.auto_allocate ?? true)
    const supabase = createClient()
    const { error } = await supabase.from('employees').update({ auto_allocate: newVal }).eq('id', emp.id)
    if (error) toast.error(error.message)
    else setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, auto_allocate: newVal } : e))
  }

  // ── Weekoffs ──────────────────────────────────────────────────────────────────
  async function addWeekoff() {
    if (!woForm.employee_id || (!woForm.day_of_week && !woForm.specific_date)) {
      return toast.error('Select employee and day or date')
    }
    setWoLoading(true)
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
    setWoLoading(false)
  }

  async function removeWeekoff(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('weekoffs').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setWeekoffs(prev => prev.filter(w => w.id !== id)); toast.success('Removed') }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-brand-800">Allocation & Org Tree</h1>

      {/* ── Unified allocation table ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-brand-800">Lead Allocation</h2>
          <p className="text-[8px] text-brand-400 font-semibold mt-0.5">
            Score controls weighted distribution. Score 0 or toggle off = excluded from auto-allocation. Manual transfer always works.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-brand-50 border-b border-brand-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-500">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-500">Reports to</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-brand-500">Score</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-brand-500">Active leads</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-brand-500">Today's activity</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-brand-500">Auto allocate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {sorted.map(emp => {
                const isEditing  = emp.id in editScore
                const scoreInput = editScore[emp.id] ?? String(emp.score ?? '')
                const autoOn     = emp.auto_allocate ?? true
                const activities = activityCounts[emp.id] ?? 0
                const leads      = leadCounts[emp.id] ?? 0
                const lowActivity = activities < 2

                return (
                  <tr key={emp.id} className="hover:bg-brand-50/50 transition-colors">
                    {/* Name + role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-brand-900">{emp.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[emp.role] ?? 'bg-slate-100 text-slate-600'}`}>
                          {emp.role}
                        </span>
                      </div>
                    </td>

                    {/* Reports to */}
                    <td className="px-4 py-3 text-xs text-brand-400">
                      {emp.reports_to ? nameMap[emp.reports_to] ?? '—' : '—'}
                    </td>

                    {/* Score — inline edit */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number" min={0} max={10}
                            value={scoreInput}
                            onChange={e => setEditScore(prev => ({ ...prev, [emp.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') saveScore(emp); if (e.key === 'Escape') setEditScore(prev => { const n={...prev}; delete n[emp.id]; return n }) }}
                            className="w-12 text-center text-sm border border-brand-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            autoFocus
                          />
                          <button
                            onClick={() => saveScore(emp)}
                            disabled={savingScore === emp.id}
                            className="text-xs text-brand-600 hover:text-brand-800 font-semibold disabled:opacity-40"
                          >
                            {savingScore === emp.id ? '…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditScore(prev => { const n={...prev}; delete n[emp.id]; return n })}
                            className="text-xs text-brand-300 hover:text-brand-500"
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditScore(prev => ({ ...prev, [emp.id]: String(emp.score ?? '') }))}
                          className={`text-sm font-semibold tabular-nums hover:text-brand-700 transition-colors ${(emp.score ?? 1) === 0 ? 'text-red-500' : 'text-brand-800'}`}
                          title="Click to edit score"
                        >
                          {emp.score ?? '—'}<span className="text-brand-300 font-normal">/10</span>
                        </button>
                      )}
                    </td>

                    {/* Lead count */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-brand-700">{leads}</span>
                    </td>

                    {/* Activity count — red if low */}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${lowActivity ? 'text-red-500' : 'text-brand-700'}`}>
                        {activities}
                      </span>
                    </td>

                    {/* Auto allocate toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAutoAllocate(emp)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1 ${autoOn ? 'bg-brand-400' : 'bg-slate-300'}`}
                        title={autoOn ? 'Click to disable auto allocation' : 'Click to enable auto allocation'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoOn ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Weekoff Management ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-brand-800">Weekoff Management</h2>
            <p className="text-[8px] text-brand-400 font-semibold mt-0.5">Employees on weekoff are skipped in auto-allocation for that day</p>
          </div>
          <Button size="sm" onClick={() => setWeekoffModal(true)}>
            <Plus size={14} /> Add Weekoff
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden overflow-x-auto">
          {weekoffs.length === 0 ? (
            <p className="p-5 text-sm text-brand-400 text-center">No weekoffs configured</p>
          ) : (
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-brand-50 border-b border-brand-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-500">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-500">Day</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-500">Specific Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {weekoffs.map(w => (
                  <tr key={w.id} className="hover:bg-brand-50/50">
                    <td className="px-4 py-3 font-medium text-brand-800">{nameMap[w.employee_id] ?? w.employee_id}</td>
                    <td className="px-4 py-3 text-brand-600 capitalize">{w.day_of_week || '—'}</td>
                    <td className="px-4 py-3 text-brand-600">{w.specific_date || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeWeekoff(w.id)} className="text-brand-300 hover:text-red-500 transition-colors">
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
              onChange={e => setWoForm(p => ({ ...p, employee_id: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Select employee…</option>
              {sorted.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Recurring Day Off</label>
            <select
              value={woForm.day_of_week}
              onChange={e => setWoForm(p => ({ ...p, day_of_week: e.target.value, specific_date: '' }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
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
              onChange={e => setWoForm(p => ({ ...p, specific_date: e.target.value, day_of_week: '' }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setWeekoffModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={woLoading} onClick={addWeekoff}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
