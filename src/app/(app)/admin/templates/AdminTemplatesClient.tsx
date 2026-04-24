'use client'

import { useState } from 'react'
import { Employee, WaTemplate } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, MessageSquare, ToggleLeft, ToggleRight } from 'lucide-react'

interface Props { admin: Employee; templates: WaTemplate[] }
const EMPTY = { name: '', body: '' }

export function AdminTemplatesClient({ admin, templates: initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const [selected, setSelected] = useState<WaTemplate | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!form.name || !form.body) return toast.error('Name and body required')
    setLoading(true)
    const supabase = createClient()
    if (modal === 'new') {
      const { data, error } = await supabase.from('wa_templates').insert({ org_id: admin.org_id, name: form.name, body: form.body, created_by: admin.id }).select().single()
      if (error) toast.error(error.message)
      else { setTemplates(prev => [...prev, data]); toast.success('Template created'); setModal(null) }
    } else if (modal === 'edit' && selected) {
      const { data, error } = await supabase.from('wa_templates').update({ name: form.name, body: form.body }).eq('id', selected.id).select().single()
      if (error) toast.error(error.message)
      else { setTemplates(prev => prev.map(t => t.id === data.id ? data : t)); toast.success('Updated'); setModal(null) }
    }
    setLoading(false)
  }

  async function toggleActive(t: WaTemplate) {
    const supabase = createClient()
    const { data, error } = await supabase.from('wa_templates').update({ is_active: !t.is_active }).eq('id', t.id).select().single()
    if (error) toast.error(error.message)
    else setTemplates(prev => prev.map(x => x.id === data.id ? data : x))
  }

  async function deleteTemplate(t: WaTemplate) {
    if (!confirm(`Delete template "${t.name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('wa_templates').delete().eq('id', t.id)
    if (error) toast.error(error.message)
    else { setTemplates(prev => prev.filter(x => x.id !== t.id)); toast.success('Deleted') }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">WhatsApp Templates</h1>
        <Button size="sm" onClick={() => { setForm(EMPTY); setModal('new') }}><Plus size={15} />New Template</Button>
      </div>

      <div className="space-y-4">
        {templates.map(t => (
          <Card key={t.id} className={!t.is_active ? 'opacity-60' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => toggleActive(t)} className="text-slate-400 hover:text-indigo-600" title="Toggle active">
                        {t.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => { setSelected(t); setForm({ name: t.name, body: t.body }); setModal('edit') }} className="text-slate-400 hover:text-indigo-600"><Edit size={15} /></button>
                      <button onClick={() => deleteTemplate(t)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{t.body}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No templates yet</p>}
      </div>

      <Modal open={modal === 'new' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'new' ? 'New Template' : 'Edit Template'}>
        <div className="p-5 space-y-4">
          <Input label="Template Name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Initial Contact" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Message Body</label>
            <p className="text-xs text-slate-500">Use &#123;&#123;name&#125;&#125; for the lead&apos;s name</p>
            <textarea value={form.body} onChange={e => setForm(p => ({...p, body: e.target.value}))} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
