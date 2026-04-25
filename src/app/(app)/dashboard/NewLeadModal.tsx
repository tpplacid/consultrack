'use client'

import { useState } from 'react'
import { Employee } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
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

    const res = await fetch('/api/leads/create-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error || 'Failed to create lead')
    } else {
      toast.success('Lead created!')
      router.refresh()
      onClose()
    }
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
