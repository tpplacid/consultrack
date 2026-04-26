'use client'

import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus, Ticket, CheckCircle2, Clock, Loader2,
  ChevronDown, ChevronUp, Send, AlertCircle,
} from 'lucide-react'

type TicketStatus = 'open' | 'in_progress' | 'resolved'
type TicketType = 'upgrade_request' | 'general' | 'bug'

interface TicketMessage {
  id: string
  sender_type: 'org' | 'superadmin'
  sender_name: string
  body: string
  created_at: string
}

interface Ticket {
  id: string
  subject: string
  message: string
  type: TicketType
  feature_key: string | null
  status: TicketStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
  ticket_messages: TicketMessage[]
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
}
const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}
const TYPE_LABELS: Record<TicketType, string> = {
  upgrade_request: 'Upgrade Request',
  general: 'General',
  bug: 'Bug Report',
}

interface Props { initialTickets: Ticket[] }

export default function SupportClient({ initialTickets }: Props) {
  // Sort messages chronologically on initial load
  const normalise = (t: Ticket): Ticket => ({
    ...t,
    ticket_messages: [...(t.ticket_messages ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  })

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets.map(normalise))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newType, setNewType] = useState<TicketType>('general')
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null)

  // Per-ticket reply state
  const [replyBody, setReplyBody] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)

  const bottomRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Scroll to bottom of chat when expanded
  useEffect(() => {
    if (expanded && bottomRefs.current[expanded]) {
      bottomRefs.current[expanded]?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [expanded, tickets])

  async function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: newSubject, message: newMessage, type: newType }),
    })
    if (res.ok) {
      const { ticket } = await res.json()
      const normalised = normalise({ ...ticket, ticket_messages: [] })
      setTickets(prev => [normalised, ...prev])
      setSuccessTicketId(ticket.id)
      setNewSubject(''); setNewMessage(''); setNewType('general')
      setShowForm(false)
      // Expand the new ticket so they see it
      setExpanded(ticket.id)
    }
    setSubmitting(false)
  }

  async function handleSendReply(ticketId: string) {
    const body = replyBody[ticketId]?.trim()
    if (!body) return
    setSendingReply(ticketId)
    const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setTickets(prev => prev.map(t =>
        t.id === ticketId
          ? { ...t, ticket_messages: [...t.ticket_messages, message] }
          : t
      ))
      setReplyBody(prev => ({ ...prev, [ticketId]: '' }))
    }
    setSendingReply(null)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-800">Support</h1>
          <p className="text-[8px] text-brand-400 font-semibold mt-0.5">
            Raise tickets with the Consultrack team — upgrade requests, issues, or general enquiries
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setSuccessTicketId(null) }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition"
        >
          <Plus size={14} />
          New ticket
        </button>
      </div>

      {/* Success banner */}
      {successTicketId && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Ticket submitted successfully</p>
            <p className="text-xs text-green-600 mt-0.5">
              #{successTicketId.slice(0, 8).toUpperCase()} — we'll get back to you within 1 business day
            </p>
          </div>
          <button onClick={() => setSuccessTicketId(null)} className="text-green-400 hover:text-green-600 text-sm font-bold">✕</button>
        </div>
      )}

      {/* Stats */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Open',        count: tickets.filter(t => t.status === 'open').length,        color: 'text-amber-600' },
            { label: 'In Progress', count: tickets.filter(t => t.status === 'in_progress').length, color: 'text-blue-600'  },
            { label: 'Resolved',    count: tickets.filter(t => t.status === 'resolved').length,    color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">New support ticket</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
          </div>
          <form onSubmit={handleSubmitNew} className="px-5 py-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {(['general', 'upgrade_request', 'bug'] as TicketType[]).map(t => (
                <button key={t} type="button" onClick={() => setNewType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    newType === t ? 'bg-brand-800 text-white border-brand-800' : 'text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
              <input required value={newSubject} onChange={e => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="Brief summary of your request" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
              <textarea required rows={4} value={newMessage} onChange={e => setNewMessage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                placeholder="Describe your issue or request in detail…" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-60">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Ticket size={13} />}
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets list */}
      {tickets.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Ticket size={22} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">No tickets yet</p>
          <p className="text-xs text-slate-400">Raise a ticket to get help from the Consultrack team</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => {
            const hasUnreadReply = t.ticket_messages.some(m => m.sender_type === 'superadmin')
            return (
              <div key={t.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                >
                  {t.status === 'resolved'
                    ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    : t.status === 'in_progress'
                    ? <Clock size={16} className="text-blue-500 flex-shrink-0" />
                    : <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.subject}</p>
                      {hasUnreadReply && expanded !== t.id && (
                        <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" title="Has reply from Consultrack" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {TYPE_LABELS[t.type]} · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      {t.ticket_messages.length > 0 && (
                        <span className="ml-1.5 text-slate-500">· {t.ticket_messages.length} message{t.ticket_messages.length !== 1 ? 's' : ''}</span>
                      )}
                    </p>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${STATUS_STYLES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                  {expanded === t.id
                    ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
                    : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
                </button>

                {/* Expanded: chat thread */}
                {expanded === t.id && (
                  <div className="border-t border-slate-100">
                    {/* Original message */}
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Original message</p>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-brand-800 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.message}</p>
                          <p className="text-[10px] text-brand-200 mt-1">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    {t.ticket_messages.length > 0 && (
                      <div className="px-4 py-2 space-y-3">
                        {t.ticket_messages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender_type === 'org' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              msg.sender_type === 'org'
                                ? 'bg-brand-800 text-white rounded-tr-sm'
                                : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                            }`}>
                              {msg.sender_type === 'superadmin' && (
                                <p className="text-[10px] font-bold text-brand-400 mb-1">{msg.sender_name}</p>
                              )}
                              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.sender_type === 'superadmin' ? 'text-slate-800' : 'text-white'}`}>
                                {msg.body}
                              </p>
                              <p className={`text-[10px] mt-1 ${msg.sender_type === 'org' ? 'text-brand-200' : 'text-slate-400'}`}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div ref={el => { bottomRefs.current[t.id] = el }} />

                    {/* Reply input — only if not resolved */}
                    {t.status !== 'resolved' ? (
                      <div className="px-4 pb-4 pt-2 flex gap-2 items-end">
                        <textarea
                          rows={2}
                          value={replyBody[t.id] ?? ''}
                          onChange={e => setReplyBody(prev => ({ ...prev, [t.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(t.id) }
                          }}
                          placeholder="Reply to this ticket… (Enter to send)"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                        />
                        <button
                          onClick={() => handleSendReply(t.id)}
                          disabled={!replyBody[t.id]?.trim() || sendingReply === t.id}
                          className="p-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl transition disabled:opacity-40 flex-shrink-0"
                        >
                          {sendingReply === t.id
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Send size={16} />}
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 pb-4 pt-2">
                        <p className="text-xs text-center text-slate-400 py-2 bg-slate-50 rounded-lg">
                          This ticket is resolved. <button onClick={() => {}} className="text-brand-500 font-semibold">Raise a new ticket</button> if you need further help.
                        </p>
                      </div>
                    )}

                    {/* Footer meta */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                      <p className="text-[10px] text-slate-400">
                        Ticket #{t.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
