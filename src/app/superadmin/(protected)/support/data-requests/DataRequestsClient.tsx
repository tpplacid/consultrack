'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, X, Download, Trash2, Loader2, ExternalLink } from 'lucide-react'

type Request = {
  id: string
  org_id: string
  requested_by_employee_id: string
  request_type: 'export' | 'reset'
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed'
  reason: string | null
  rejection_reason: string | null
  sa_decided_by: string | null
  sa_decided_at: string | null
  completed_at: string | null
  export_url: string | null
  export_expires_at: string | null
  failure_reason: string | null
  created_at: string
  org: { id: string; name: string; slug: string } | null | { id: string; name: string; slug: string }[]
  requester: { id: string; name: string; email: string } | null | { id: string; name: string; email: string }[]
}

const STATUS_STYLES: Record<Request['status'], string> = {
  pending:   'bg-amber-500/10  text-amber-300   border-amber-500/20',
  approved:  'bg-blue-500/10   text-blue-300    border-blue-500/20',
  rejected:  'bg-rose-500/10   text-rose-300    border-rose-500/20',
  completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  failed:    'bg-rose-500/10   text-rose-300    border-rose-500/20',
}

export default function DataRequestsClient({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [tab, setTab] = useState<'export' | 'reset'>('export')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(
    () => requests.filter(r => r.request_type === tab),
    [requests, tab],
  )

  // Pending tab counts surface unfinished work to the SA at-a-glance.
  const pendingExport = requests.filter(r => r.request_type === 'export' && r.status === 'pending').length
  const pendingReset  = requests.filter(r => r.request_type === 'reset'  && r.status === 'pending').length

  async function handleApprove(id: string) {
    if (!confirm('Approve this request? The action will execute immediately.')) return
    setBusyId(id)
    const res = await fetch(`/api/superadmin/data-requests/${id}/approve`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      toast.success('Approved and executed')
      // Patch the row inline rather than refetching — simpler than wiring
      // up another data load just to reflect a single-row change.
      setRequests(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'completed',
        completed_at: new Date().toISOString(),
        sa_decided_at: new Date().toISOString(),
        export_url: json.export_url ?? r.export_url,
        export_expires_at: json.expires_at ?? r.export_expires_at,
      } : r))
    } else {
      toast.error(json.error ?? 'Approval failed')
      setRequests(prev => prev.map(r => r.id === id
        ? { ...r, status: 'failed', failure_reason: json.error ?? 'unknown' }
        : r))
    }
    setBusyId(null)
  }

  async function handleReject(id: string) {
    const reason = prompt('Rejection reason (optional, shown to org admin):') ?? ''
    if (reason === null) return
    setBusyId(id)
    const res = await fetch(`/api/superadmin/data-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      toast.success('Rejected')
      setRequests(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'rejected',
        rejection_reason: reason || null,
        sa_decided_at: new Date().toISOString(),
      } : r))
    } else {
      toast.error(json.error ?? 'Reject failed')
    }
    setBusyId(null)
  }

  function orgOf(r: Request) {
    return Array.isArray(r.org) ? r.org[0] : r.org
  }
  function reqOf(r: Request) {
    return Array.isArray(r.requester) ? r.requester[0] : r.requester
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/superadmin/support"
          className="inline-flex items-center gap-1.5 text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] text-sm mb-8 transition-colors">
          <ArrowLeft size={13} /> Support
        </Link>

        <h1 className="text-2xl font-semibold text-[var(--sa-text)] tracking-tight mb-1">Data Requests</h1>
        <p className="text-sm text-[var(--sa-text-muted)] mb-6">
          Org admins submit data export and reset requests here for your approval. Approving an export
          generates a downloadable CSV; approving a reset wipes the org&rsquo;s lead data immediately.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-[var(--sa-divider)]">
          <button onClick={() => setTab('export')}
            className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'export'
                ? 'border-[var(--sa-accent)] text-[var(--sa-text)]'
                : 'border-transparent text-[var(--sa-text-muted)] hover:text-[var(--sa-text)]'
            }`}>
            <Download size={13} />
            Export Requests
            {pendingExport > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300">{pendingExport}</span>
            )}
          </button>
          <button onClick={() => setTab('reset')}
            className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'reset'
                ? 'border-[var(--sa-accent)] text-[var(--sa-text)]'
                : 'border-transparent text-[var(--sa-text-muted)] hover:text-[var(--sa-text)]'
            }`}>
            <Trash2 size={13} />
            Reset Requests
            {pendingReset > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300">{pendingReset}</span>
            )}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--sa-text-muted)] border border-[var(--sa-divider)] rounded-2xl bg-[var(--sa-surface)]">
            No {tab} requests yet.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const org = orgOf(r)
              const requester = reqOf(r)
              const busy = busyId === r.id
              return (
                <div key={r.id} className="rounded-2xl border border-[var(--sa-divider)] bg-[var(--sa-surface)] p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-[var(--sa-text)]">{org?.name ?? '(unknown org)'}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--sa-text-muted)]">
                        Requested by {requester?.name ?? '?'} ({requester?.email ?? '—'}) ·{' '}
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleApprove(r.id)} disabled={busy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40 transition">
                          {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Approve
                        </button>
                        <button onClick={() => handleReject(r.id)} disabled={busy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-40 transition">
                          <X size={11} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {r.reason && (
                    <p className="text-[11px] text-[var(--sa-text-secondary)] mb-1.5">
                      <span className="text-[var(--sa-text-muted)]">Reason:</span> {r.reason}
                    </p>
                  )}

                  {r.status === 'rejected' && r.rejection_reason && (
                    <p className="text-[11px] text-rose-300/80 mb-1.5">
                      <span className="text-[var(--sa-text-muted)]">Rejected:</span> {r.rejection_reason}
                    </p>
                  )}

                  {r.status === 'completed' && r.export_url && (
                    <a href={r.export_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-300 hover:text-emerald-200 underline">
                      <Download size={11} />
                      Download CSV
                      <ExternalLink size={10} />
                      <span className="text-[var(--sa-text-muted)] ml-1">
                        (expires {r.export_expires_at ? formatDistanceToNow(new Date(r.export_expires_at), { addSuffix: true }) : '?'})
                      </span>
                    </a>
                  )}

                  {r.status === 'failed' && r.failure_reason && (
                    <p className="text-[11px] text-rose-300 mt-1">
                      Failed: <span className="font-mono">{r.failure_reason}</span>
                    </p>
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
