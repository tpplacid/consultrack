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
  const [customText, setCustomText] = useState('')
  const [sending, setSending] = useState(false)

  function renderTemplate(body: string): string {
    return body.replace('{{name}}', lead.name)
  }

  const messageBody = selected ? renderTemplate(selected.body) : customText

  async function handleSend() {
    setSending(true)
    const url = buildWAUrl(lead.phone, messageBody)

    // window.open must be called synchronously — before any await — so that
    // iOS Safari and Android Chrome still treat it as a direct user gesture.
    // Programmatic anchor.click() with target="_blank" is blocked on mobile
    // browsers regardless of gesture origin.
    window.open(url, '_blank', 'noopener,noreferrer')

    const supabase = createClient()
    await supabase.from('activities').insert({
      org_id: lead.org_id,
      lead_id: lead.id,
      employee_id: employeeId,
      activity_type: 'whatsapp_sent',
      note: selected
        ? `WhatsApp sent via template: ${selected.name}`
        : 'WhatsApp opened (no template)',
    })

    toast.success('WhatsApp opened! Activity logged.')
    setSending(false)
    onClose()
  }

  async function handleCopy() {
    if (!messageBody) return
    await navigator.clipboard.writeText(messageBody)
    toast.success('Copied to clipboard')
  }

  function handleSelectTemplate(t: WaTemplate) {
    if (selected?.id === t.id) {
      setSelected(null)
    } else {
      setSelected(t)
      setCustomText('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send WhatsApp Message" size="lg">
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-600">
          Sending to <strong>{lead.name}</strong> ({lead.phone})
        </p>

        {templates.filter(t => t.is_active).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Templates (optional)</p>
            {templates.filter(t => t.is_active).map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
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
        )}

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {selected ? 'Preview' : 'Custom message (optional)'}
          </p>
          <textarea
            value={messageBody}
            onChange={e => { setSelected(null); setCustomText(e.target.value) }}
            rows={4}
            placeholder="Type a custom message, or select a template above…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!messageBody}>
            <Copy size={14} />
            Copy
          </Button>
          <Button size="sm" onClick={handleSend} loading={sending} className="flex-1">
            <ExternalLink size={14} />
            Open WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  )
}
