'use client'

import { useState } from 'react'
import { Employee, Lead } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  open: boolean
  onClose: () => void
  employee: Employee
}

export function NewLeadModal({ open, onClose, employee }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [duplicate, setDuplicate] = useState<Lead | null>(null)
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
    if (key === 'phone') setDuplicate(null)
  }

  async function checkDuplicate(phone: string): Promise<Lead | null> {
    if (!phone) return null
    const supabase = createClient()
    const { data: emp } = await supabase.from('employees').select('org_id').eq('id', employee.id).single()
    if (!emp) return null
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, main_stage, owner_id, owner:employees!leads_owner_id_fkey(id,name)')
      .eq('org_id', emp.org_id)
      .eq('phone', phone.trim())
      .limit(1)
      .single()
    return data as Lead | null
  }

  async function handlePhoneBlur() {
    if (!form.phone.trim()) return
    const dup = await checkDuplicate(form.phone.trim())
    setDuplicate(dup)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.phone) return toast.error('Name and phone required')
    setLoading(true)

    const supabase = createClient()
    const { data: emp } = await supabase.from('employees').select('org_id, reports_to').eq('id', employee.id).single()
    if (!emp) { setLoading(false); return toast.error('Employee not found') }

    // Resolve approver — use direct manager or fall back to the org's AD
    let approverId = emp.reports_to
    if (!approverId) {
      const { data: ad } = await supabase
        .from('employees')
        .select('id')
        .eq('org_id', emp.org_id)
        .eq('role', 'ad')
        .eq('is_active', true)
        .limit(1)
        .single()
      approverId = ad?.id || null
    }

    const { data: lead, error } = await supabase.from('leads').insert({
      org_id: emp.org_id,
      name: form.name,
      phone: form.phone.trim(),
      source: form.source,
      main_stage: '0',
      owner_id: employee.id,
      reporting_manager_id: emp.reports_to,
      location: form.location || null,
      lead_type: form.lead_type || null,
      preferred_course: form.preferred_course || null,
      comments: form.comments || null,
      approved: false,
    }).select().single()

    if (error || !lead) {
      toast.error(error?.message || 'Failed to create lead')
      setLoading(false)
      return
    }

    await supabase.from('activities').insert({
      org_id: emp.org_id,
      lead_id: lead.id,
      employee_id: employee.id,
      activity_type: 'lead_created',
      note: `Lead created via ${form.source}`,
    })

    if (approverId) {
      const { error: approvalError } = await supabase.from('offline_lead_approvals').insert({
        org_id: emp.org_id,
        lead_id: lead.id,
        submitted_by: employee.id,
        approver_id: approverId,
      })
      if (approvalError) console.error('Approval insert failed:', approvalError.message)
    }

    // Bust admin-leads + analytics caches so the new lead shows immediately
    // when the admin navigates to /admin/leads or /admin/analytics next.
    void fetch('/api/cache/invalidate-leads', { method: 'POST' })
    toast.success('Lead created!')
    router.refresh()
    onClose()
    setLoading(false)
  }

  function handleClose() {
    setForm({ name: '', phone: '', source: 'offline', location: '', lead_type: '', preferred_course: '', comments: '' })
    setDuplicate(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Lead" size="md">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Input label="Full Name" required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Student name" />

        <div className="space-y-1">
          <Input
            label="Phone"
            required
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder="+91 9XXXXXXXXX"
          />
          {duplicate && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 mt-1">
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold">Duplicate phone number</p>
                <p>
                  This number is already linked to{' '}
                  <Link href={`/leads/${duplicate.id}`} className="underline font-semibold" onClick={handleClose}>
                    {duplicate.name}
                  </Link>
                  {' '}(Stage {duplicate.main_stage}
                  {(duplicate.owner as Employee)?.name ? ` · ${(duplicate.owner as Employee).name}` : ''}).
                  You can still save if this is intentional.
                </p>
              </div>
            </div>
          )}
        </div>

        <Select label="Source" value={form.source} onChange={e => update('source', e.target.value as 'offline' | 'referral')}>
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
          <Button variant="outline" type="button" onClick={handleClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">
            {duplicate ? 'Save Anyway' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
