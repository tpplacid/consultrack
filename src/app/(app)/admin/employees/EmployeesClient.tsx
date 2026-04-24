'use client'

import { useState } from 'react'
import { Employee, EmployeeRole, ROLE_LABELS } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Edit, UserX, UserCheck, KeyRound } from 'lucide-react'

interface Props { admin: Employee; employees: Employee[] }

const EMPTY_FORM = { name: '', email: '', role: 'telesales' as EmployeeRole, reports_to: '', password: '' }

export function EmployeesClient({ admin, employees: initialEmployees }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [modal, setModal] = useState<'new' | 'edit' | 'reset' | null>(null)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  function update(k: string, v: string) { setForm(p => ({...p, [k]: v})) }

  function openEdit(emp: Employee) {
    setSelected(emp)
    setForm({ name: emp.name, email: emp.email, role: emp.role, reports_to: emp.reports_to || '', password: '' })
    setModal('edit')
  }

  function openReset(emp: Employee) { setSelected(emp); setForm(p => ({...p, password: ''})); setModal('reset') }

  async function handleSave() {
    if (!form.name || !form.email) return toast.error('Name and email required')
    setLoading(true)
    const supabase = createClient()

    if (modal === 'new') {
      // Create auth user + employee row via admin API
      const res = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, org_id: admin.org_id }),
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error || 'Failed')
      else {
        setEmployees(prev => [...prev, data.employee])
        toast.success('Employee created')
        setModal(null)
      }
    } else if (modal === 'edit' && selected) {
      const { data, error } = await supabase
        .from('employees')
        .update({ name: form.name, role: form.role, reports_to: form.reports_to || null })
        .eq('id', selected.id)
        .select().single()
      if (error) toast.error(error.message)
      else { setEmployees(prev => prev.map(e => e.id === data.id ? data : e)); toast.success('Updated'); setModal(null) }
    }
    setLoading(false)
  }

  async function handleResetPassword() {
    if (!form.password || !selected) return toast.error('Enter new password')
    setLoading(true)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: selected.id, email: selected.email, new_password: form.password }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error || 'Failed')
    else { toast.success('Password reset'); setModal(null) }
    setLoading(false)
  }

  async function toggleActive(emp: Employee) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: !emp.is_active })
      .eq('id', emp.id).select().single()
    if (error) toast.error(error.message)
    else { setEmployees(prev => prev.map(e => e.id === data.id ? data : e)); toast.success(data.is_active ? 'Activated' : 'Deactivated') }
  }

  const tls = employees.filter(e => e.role === 'tl' || e.role === 'ad')

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Employees</h1>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setModal('new') }}>
          <Plus size={15} />
          Add Employee
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Reports To</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Score</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(e => {
              const manager = employees.find(m => m.id === e.reports_to)
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">{getInitials(e.name)}</div>
                      <div>
                        <p className="font-medium text-slate-900">{e.name}</p>
                        <p className="text-xs text-slate-500">{e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[e.role]}</td>
                  <td className="px-4 py-3 text-slate-600">{manager?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-indigo-600">{e.score}</span>
                    <span className="text-slate-400">/10</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${e.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {e.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(e)} className="text-slate-500 hover:text-indigo-600" title="Edit"><Edit size={15} /></button>
                      <button onClick={() => openReset(e)} className="text-slate-500 hover:text-orange-600" title="Reset password"><KeyRound size={15} /></button>
                      <button onClick={() => toggleActive(e)} className="text-slate-500 hover:text-red-600" title={e.is_active ? 'Deactivate' : 'Activate'}>
                        {e.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New/Edit Modal */}
      <Modal open={modal === 'new' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'new' ? 'Add Employee' : 'Edit Employee'}>
        <div className="p-5 space-y-4">
          <Input label="Full Name" required value={form.name} onChange={e => update('name', e.target.value)} />
          <Input label="Email" type="email" required value={form.email} onChange={e => update('email', e.target.value)} disabled={modal === 'edit'} />
          {modal === 'new' && <Input label="Password" type="password" required value={form.password} onChange={e => update('password', e.target.value)} placeholder="Temporary password" />}
          <Select label="Role" value={form.role} onChange={e => update('role', e.target.value)}>
            <option value="telesales">Telesales</option>
            <option value="counsellor">Counsellor</option>
            <option value="tl">Team Lead</option>
            <option value="ad">AD / Admin</option>
          </Select>
          <Select label="Reports To" value={form.reports_to} onChange={e => update('reports_to', e.target.value)}>
            <option value="">None</option>
            {tls.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={modal === 'reset'} onClose={() => setModal(null)} title="Reset Password">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">Set a new password for <strong>{selected?.name}</strong>.</p>
          <Input label="New Password" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 8 characters" />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={handleResetPassword}>Reset</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
