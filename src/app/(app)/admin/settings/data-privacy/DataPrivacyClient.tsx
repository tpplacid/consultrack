'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { Download, Trash2, ShieldCheck, Loader2, ExternalLink, Clock, Check, AlertTriangle, X } from 'lucide-react'
import type { DataRequest } from '@/lib/dataRequests'

const STATUS_LABEL: Record<DataRequest['status'], string> = {
  pending:   'Pending Superadmin approval',
  approved:  'Approved — running',
  rejected:  'Rejected',
  completed: 'Completed',
  failed:    'Failed',
}
const STATUS_ICON: Record<DataRequest['status'], React.ReactNode> = {
  pending:   <Clock size={11} />,
  approved:  <Loader2 size={11} className="animate-spin" />,
  rejected:  <X size={11} />,
  completed: <Check size={11} />,
  failed:    <AlertTriangle size={11} />,
}
const STATUS_STYLE: Record<DataRequest['status'], string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  approved:  'bg-blue-50 text-blue-700 border-blue-200',
  rejected:  'bg-rose-50 text-rose-700 border-rose-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:    'bg-rose-50 text-rose-700 border-rose-200',
}

export default function DataPrivacyClient({ initialRequests }: { initialRequests: DataRequest[] }) {
  const [requests, setRequests] = useState<DataRequest[]>(initialRequests)
  const [submitting, setSubmitting] = useState<'export' | 'reset' | null>(null)
  const [reason, setReason] = useState('')

  const exportPending = requests.find(r => r.request_type === 'export' && (r.status === 'pending' || r.status === 'approved'))
  const resetPending  = requests.find(r => r.request_type === 'reset'  && (r.status === 'pending' || r.status === 'approved'))

  // Latest completed export still within signed-URL window — surface a
  // download link near the Export button so the admin doesn't have to
  // scroll through history to find it.
  const latestExport = requests.find(r =>
    r.request_type === 'export' && r.status === 'completed' && r.export_url &&
    (!r.export_expires_at || new Date(r.export_expires_at) > new Date())
  )

  async function submit(type: 'export' | 'reset') {
    if (type === 'reset') {
      if (!confirm('This will WIPE all leads and activity history once approved by Superadmin. Employee accounts and configuration are kept. Continue?')) return
    }
    setSubmitting(type)
    const res = await fetch('/api/admin/data-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, reason: reason.trim() }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      toast.success(`${type === 'export' ? 'Export' : 'Reset'} request submitted to Superadmin`)
      setRequests(prev => [json.request, ...prev])
      setReason('')
    } else {
      toast.error(json.error ?? 'Could not submit request')
    }
    setSubmitting(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-800 flex items-center gap-2">
          <ShieldCheck size={18} />
          Data &amp; Privacy
        </h1>
        <p className="text-[11px] text-brand-500 mt-1 leading-relaxed">
          Request a full data export or reset of your organisation&rsquo;s lead data. Both actions
          require Superadmin approval before they execute — you&rsquo;ll see status updates here as
          they progress.
        </p>
      </div>

      {/* Optional reason input — single field shared by both actions */}
      <div className="bg-white rounded-2xl border border-brand-100 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-brand-700 mb-1.5">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. End-of-quarter audit, switching CRMs, GDPR request from subject…"
            className="w-full px-3 py-2 border border-brand-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <p className="text-[10px] text-brand-400 mt-1">Visible to Superadmin when they review your request.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {/* Export */}
          <ActionCard
            icon={<Download size={14} />}
            title="Export all data"
            body="Generates a CSV of every lead, owner, stage, and custom field for your org. Once Superadmin approves, you'll get a download link valid for 7 days."
            buttonLabel={exportPending ? `${STATUS_LABEL[exportPending.status]}` : 'Request export'}
            disabled={!!exportPending || submitting === 'export'}
            loading={submitting === 'export'}
            onClick={() => submit('export')}
            buttonVariant="primary"
          >
            {latestExport && (
              <a
                href={latestExport.export_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 underline mt-2"
              >
                <Download size={11} />
                Download latest export
                <ExternalLink size={10} />
              </a>
            )}
          </ActionCard>

          {/* Reset */}
          <ActionCard
            icon={<Trash2 size={14} />}
            title="Reset organisation data"
            body="Permanently deletes leads, activities, deadlines, and approval rows. Employee accounts, stage definitions, and integrations are kept so your team can re-onboard cleanly."
            buttonLabel={resetPending ? `${STATUS_LABEL[resetPending.status]}` : 'Request reset'}
            disabled={!!resetPending || submitting === 'reset'}
            loading={submitting === 'reset'}
            onClick={() => submit('reset')}
            buttonVariant="danger"
          />
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <p className="text-xs font-semibold text-brand-700 mb-3">Request history</p>
        {requests.length === 0 ? (
          <p className="text-xs text-brand-400">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="border border-brand-50 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-brand-800 capitalize">{r.request_type}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_STYLE[r.status]}`}>
                      {STATUS_ICON[r.status]} {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <span className="text-[10px] text-brand-400">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                {r.reason && (
                  <p className="text-brand-500 mt-1">{r.reason}</p>
                )}
                {r.status === 'rejected' && r.rejection_reason && (
                  <p className="text-rose-600 mt-1"><span className="text-brand-400">Rejected:</span> {r.rejection_reason}</p>
                )}
                {r.status === 'completed' && r.export_url && (
                  <a href={r.export_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 underline mt-1">
                    <Download size={11} /> Download CSV <ExternalLink size={10} />
                  </a>
                )}
                {r.status === 'failed' && r.failure_reason && (
                  <p className="text-rose-600 mt-1 font-mono">Error: {r.failure_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionCard({
  icon, title, body, buttonLabel, disabled, loading, onClick, buttonVariant, children,
}: {
  icon: React.ReactNode
  title: string
  body: string
  buttonLabel: string
  disabled: boolean
  loading: boolean
  onClick: () => void
  buttonVariant: 'primary' | 'danger'
  children?: React.ReactNode
}) {
  return (
    <div className="border border-brand-100 rounded-xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <span className={buttonVariant === 'danger' ? 'text-rose-600' : 'text-brand-700'}>{icon}</span>
        <h2 className="text-sm font-bold text-brand-800">{title}</h2>
      </div>
      <p className="text-[11px] text-brand-500 leading-relaxed mb-3 flex-1">{body}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={
          'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ' +
          (buttonVariant === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700 text-white disabled:bg-rose-200'
            : 'bg-brand-800 hover:bg-brand-900 text-white')
        }
      >
        {loading && <Loader2 size={12} className="animate-spin" />}
        {buttonLabel}
      </button>
      {children}
    </div>
  )
}
