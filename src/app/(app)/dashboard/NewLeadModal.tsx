'use client'

import { useState } from 'react'
import { Employee } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  employee: Employee
}

export function NewLeadModal({ open, onClose, employee }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    source: 'offline' as 'offline' | 'referral',
    location: '',
    lead_type: '',
    preferred_course: '',
    comments: '',
  })

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.phone) return toast.error('Name and phone required')
    setLoading(true)

    const supabase = createClient()
    const { data: emp } = await supabase.from('employees').select('org_id, reports_to').eq('id', employee.id).single()
    if (!emp) { setLoading(false); return toast.error('Employee not found') }

    // Insert lead
    const { data: lead, error } = await supabase.from('leads').insert({
      org_id: emp.org_id,
      name: form.name,
      phone: form.phone,
      source: form.source,
      main_stage: '0',
      owner_id: employee.id,
      reporting_manager_id: emp.reports_to,
      location: form.location || null,
      lead_type: form.lead_type || null,
      preferred_course: form.preferred_course || null,
      comments: form.comments || null,
      approved: false, // offline/referral always need approval; meta handled by webhook
    }).select().single()

    if (error || !lead) {
      toast.error(error?.message || 'Failed to create lead')
      setLoading(false)
      return
    }

    // Log activity
    await supabase.from('activities').insert({
      org_id: emp.org_id,
      lead_id: lead.id,
      employee_id: employee.id,
      activity_type: 'lead_created',
      note: `Lead created via ${form.source}`,
    })

    // Offline/referral always need approval
    if (emp.reports_to) {
      await supabase.from('offline_lead_approvals').insert({
        org_id: emp.org_id,
        lead_id: lead.id,
        submitted_by: employee.id,
        approver_id: emp.reports_to,
      })
    }

    toast.success('Lead created!')
    router.refresh()
    onClose()
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Lead" size="md">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Input label="Full Name" required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Student name" />
        <Input label="Phone" required value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 9XXXXXXXXX" />
        <Select label="Source" value={form.source} onChange={e => update('source', e.target.value)}>
          <option value="offline">Offline</option>
          <option value="referral">Referral</option>
        </Select>
        <Input label="Location" value={form.location} onChange={e => update('location', e.target.value)} placeholder="City" />
        <Input label="Lead Type" value={form.lead_type} onChange={e => update('lead_type', e.target.value)} placeholder="e.g. Engineering, Medical" />
        <Input label="Preferred Course" value={form.preferred_course} onChange={e => update('preferred_course', e.target.value)} placeholder="e.g. B.Tech CSE" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Comments</label>
          <textarea
            value={form.comments}
            onChange={e => update('comments', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Any notes…"
          />
        </div>
        <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Offline/Referral leads require approval from your manager before they become active.
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">Create Lead</Button>
        </div>
      </form>
    </Modal>
  )
}
