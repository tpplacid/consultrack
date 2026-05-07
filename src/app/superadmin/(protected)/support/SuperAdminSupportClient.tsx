'use client'

import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Loader2, Send,
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
  org_id: string
  org_name: string
  employee_name: string
  employee_email: string
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
  open:        'bg-amber-500/10 text-[var(--sa-accent-2)] border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-[var(--sa-accent-3)] border-blue-500/20',
  resolved:    'bg-emerald-500/10 text-[var(--sa-success)] border-emerald-500/20',
}
const STATUS_LABELS: Record<TicketStatus, string> = {
  open:        'Open',
  in_progress: 'In Progress',
  resolved:    'Resolved',
}
const TYPE_LABELS: Record<TicketType, string> = {
  upgrade_request: '🔒 Upgrade',
  general:         'General',
  bug:             '🐛 Bug',
}
const FEATURE_LABELS: Record<string, string> = {
  lead_crm:   'Lead CRM',
  sla:        'Deadline Breach',
  pipeline:   'Pipeline',
  roles:      'Roles',
  attendance: 'Attendance',
  meta:       'Meta Integration',
}

interface Props { initialTickets: Ticket[] }

export default function SuperAdminSupportClient({ initialTickets }: Props) {
  const normalise = (t: Ticket): Ticket => ({
    ...t,
    ticket_messages: [...(t.ticket_messages ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  })

  const [tickets, setTickets]       = useState<Ticket[]>(initialTickets.map(normalise))
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all')

  const [statusSaving, setStatusSaving] = useState<string | null>(null)
  const [replyBody, setReplyBody]       = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)

  const bottomRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (expanded && bottomRefs.current[expanded]) {
      bottomRefs.current[expanded]?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [expanded, tickets])

  const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus)

  async function updateStatus(id: string, status: TicketStatus) {
    setStatusSaving(id)
    const res = await fetch(`/api/superadmin/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const { ticket } = await res.json()
      setTickets(prev => prev.map(t =>
        t.id === id ? normalise({ ...ticket, ticket_messages: t.ticket_messages }) : t
      ))
    }
    setStatusSaving(null)
  }

  async function handleSendReply(ticketId: string) {
    const body = replyBody[ticketId]?.trim()
    if (!body) return
    setSendingReply(ticketId)
    const res = await fetch(`/api/superadmin/tickets/${ticketId}/messages`, {
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

  const openCount       = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount   = tickets.filter(t => t.status === 'resolved').length

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--sa-text-muted)] mb-2">
              Customer support
            </p>
            <h1 className="text-2xl font-semibold text-[var(--sa-text)] tracking-tight">Support Tickets</h1>
          </div>
          <a href="/superadmin/support/data-requests"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--sa-text-secondary)] hover:text-[var(--sa-text)] bg-[var(--sa-surface)] hover:bg-[var(--sa-surface-hover)] border border-[var(--sa-divider)] transition-colors">
            Data Requests →
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Open',        count: openCount,       icon: <AlertCircle size={14} />,  color: 'text-[var(--sa-accent-2)]'   },
            { label: 'In Progress', count: inProgressCount, icon: <Clock size={14} />,        color: 'text-[var(--sa-accent-3)]'    },
            { label: 'Resolved',    count: resolvedCount,   icon: <CheckCircle2 size={14} />, color: 'text-[var(--sa-success)]' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3 border border-[var(--sa-border)] bg-[var(--sa-surface-strong)]">
              <div className={`flex items-center gap-1.5 mb-1 ${s.color}`}>
                {s.icon}
                <p className="text-xl font-semibold tabular-nums">{s.count}</p>
              </div>
              <p className="text-[11px] text-[var(--sa-text-muted)]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-4">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                filterStatus === f
                  ? 'bg-[var(--sa-accent)] text-[var(--sa-text-on-accent)]'
                  : 'text-[var(--sa-text-secondary)] hover:text-[var(--sa-text)] bg-[var(--sa-surface)] border border-[var(--sa-border)]'
              }`}>
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1.5 opacity-60">{tickets.filter(t => t.status === f).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tickets */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-strong)]">
            <p className="text-[var(--sa-text-muted)] text-sm">
              No tickets {filterStatus !== 'all' ? `with status "${STATUS_LABELS[filterStatus as TicketStatus]}"` : 'yet'}.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(ticket => {
              const hasUnread = ticket.ticket_messages.some(m => m.sender_type === 'org')
              return (
                <div key={ticket.id} className="bg-[var(--sa-surface-strong)] border border-[var(--sa-border)] rounded-xl overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--sa-surface)] transition-colors"
                  >
                    {ticket.status === 'resolved'
                      ? <CheckCircle2 size={15} className="text-[var(--sa-success)] flex-shrink-0" />
                      : ticket.status === 'in_progress'
                      ? <Clock size={15} className="text-[var(--sa-accent-3)] flex-shrink-0" />
                      : <AlertCircle size={15} className="text-[var(--sa-accent-2)] flex-shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--sa-text)] truncate">{ticket.subject}</span>
                        <span className="text-[10px] text-[var(--sa-text-muted)] font-mono shrink-0">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                        {hasUnread && expanded !== ticket.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" title="New message from org" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--sa-text-secondary)] mt-0.5">
                        <span className="text-[var(--sa-text)] font-medium">{ticket.org_name}</span>
                        {' · '}{ticket.employee_name}
                        {' · '}{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        {ticket.ticket_messages.length > 0 && (
                          <span className="text-[var(--sa-text-muted)]"> · {ticket.ticket_messages.length} msg</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-semibold text-[var(--sa-text-muted)]">{TYPE_LABELS[ticket.type]}</span>
                      {ticket.feature_key && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--sa-surface-hover)] text-[var(--sa-text-secondary)] font-semibold border border-[var(--sa-border)]">
                          {FEATURE_LABELS[ticket.feature_key] || ticket.feature_key}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLES[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                      {expanded === ticket.id
                        ? <ChevronUp size={14} className="text-[var(--sa-text-muted)]" />
                        : <ChevronDown size={14} className="text-[var(--sa-text-muted)]" />}
                    </div>
                  </button>

                  {/* Expanded */}
                  {expanded === ticket.id && (
                    <div className="border-t border-[var(--sa-border)]">
                      {/* Status + meta bar */}
                      <div className="flex items-center gap-4 px-4 py-3 bg-[var(--sa-surface)] border-b border-[var(--sa-divider)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--sa-text-muted)] uppercase tracking-wide">Status</span>
                          <div className="relative">
                            <select
                              value={ticket.status}
                              onChange={e => updateStatus(ticket.id, e.target.value as TicketStatus)}
                              disabled={statusSaving === ticket.id}
                              className="pl-3 pr-8 py-1.5 bg-[var(--sa-surface-hover)] border border-[var(--sa-border-strong)] rounded-lg text-xs font-semibold text-[var(--sa-text)] focus:outline-none focus:ring-1 focus:ring-[var(--sa-accent)]/30 appearance-none cursor-pointer disabled:opacity-60"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                            {statusSaving === ticket.id
                              ? <Loader2 size={10} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sa-text-secondary)] pointer-events-none" />
                              : <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)] pointer-events-none" />}
                          </div>
                        </div>
                        <div className="text-xs text-[var(--sa-text-muted)]">
                          <span className="font-medium text-[var(--sa-text)]">{ticket.employee_name}</span>
                          {' · '}{ticket.employee_email}
                        </div>
                      </div>

                      {/* Chat thread */}
                      <div className="px-4 pt-4 pb-2 space-y-3 max-h-96 overflow-y-auto">
                        {/* Original message (org, right) */}
                        <div className="flex justify-end">
                          <div className="max-w-[75%] bg-[var(--sa-surface-hover)] border border-[var(--sa-border)] rounded-2xl rounded-tr-sm px-4 py-2.5">
                            <p className="text-[10px] font-bold text-[var(--sa-text-secondary)] mb-1">{ticket.employee_name} · {ticket.org_name}</p>
                            <p className="text-sm text-[var(--sa-text)] leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                            <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
                          </div>
                        </div>

                        {/* Thread messages */}
                        {ticket.ticket_messages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender_type === 'org' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              msg.sender_type === 'org'
                                ? 'bg-[var(--sa-surface-hover)] border border-[var(--sa-border)] rounded-tr-sm'
                                : 'bg-[var(--sa-surface-strong)] border border-white/[0.12] rounded-tl-sm'
                            }`}>
                              <p className="text-[10px] font-bold text-[var(--sa-text-secondary)] mb-1">
                                {msg.sender_name}
                              </p>
                              <p className="text-sm text-[var(--sa-text)] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                              <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}

                        <div ref={el => { bottomRefs.current[ticket.id] = el }} />
                      </div>

                      {/* Reply input */}
                      <div className="px-4 pb-4 pt-2 flex gap-2 items-end border-t border-[var(--sa-divider)] mt-2">
                        <textarea
                          rows={2}
                          value={replyBody[ticket.id] ?? ''}
                          onChange={e => setReplyBody(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(ticket.id) }
                          }}
                          placeholder="Reply to this org… (Enter to send, Shift+Enter for new line)"
                          className="flex-1 px-3 py-2 bg-[var(--sa-surface-hover)] border border-[var(--sa-border)] rounded-xl text-sm text-[var(--sa-text)] placeholder-[var(--sa-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--sa-accent)]/30 resize-none"
                        />
                        <button
                          onClick={() => handleSendReply(ticket.id)}
                          disabled={!replyBody[ticket.id]?.trim() || sendingReply === ticket.id}
                          className="p-2.5 bg-white hover:bg-neutral-200 text-black rounded-xl transition disabled:opacity-30 flex-shrink-0"
                        >
                          {sendingReply === ticket.id
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Send size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
