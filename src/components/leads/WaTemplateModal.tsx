'use client'

import { useState } from 'react'
import { WaTemplate, Lead } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { buildWAUrl } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { MessageSquare, ExternalLink, Copy } from 'lucide-react'

interface WaTemplateModalProps {
  open: boolean
  onClose: () => void
  lead: Lead
  templates: WaTemplate[]
  employeeId: string
}

export function WaTemplateModal({ open, onClose, lead, templates, employeeId }: WaTemplateModalProps) {
  const [selected, setSelected] = useState<WaTemplate | null>(null)
  const [sending, setSending] = useState(false)

  function renderTemplate(body: string): string {
    return body.replace('{{name}}', lead.name)
  }

  async function handleSend() {
    if (!selected) return
    setSending(true)
    const body = renderTemplate(selected.body)
    const url = buildWAUrl(lead.phone, body)

    // Log activity
    const supabase = createClient()
    await supabase.from('activities').insert({
      org_id: lead.org_id,
      lead_id: lead.id,
      employee_id: employeeId,
      activity_type: 'whatsapp_sent',
      note: `WhatsApp sent via template: ${selected.name}`,
    })

    window.open(url, '_blank')
    toast.success('WhatsApp opened! Activity logged.')
    setSending(false)
    onClose()
  }

  async function handleCopy() {
    if (!selected) return
    const body = renderTemplate(selected.body)
    await navigator.clipboard.writeText(body)
    toast.success('Copied to clipboard')
  }

  return (
    <Modal open={open} onClose={onClose} title="Send WhatsApp Message" size="lg">
      <div className="p-5 space-y-4">
        <div>
          <p className="text-sm text-slate-600 mb-3">Select a template to send to <strong>{lead.name}</strong> ({lead.phone})</p>
          <div className="space-y-2">
            {templates.filter(t => t.is_active).map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selected?.id === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare size={14} className="text-indigo-500" />
                  <span className="text-sm font-medium text-slate-900">{t.name}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{renderTemplate(t.body)}</p>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-700 font-medium mb-1">Preview:</p>
            <p className="text-sm text-green-900">{renderTemplate(selected.body)}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!selected}>
            <Copy size={14} />
            Copy Text
          </Button>
          <Button size="sm" onClick={handleSend} loading={sending} disabled={!selected} className="flex-1">
            <ExternalLink size={14} />
            Open WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  )
}
