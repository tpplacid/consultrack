'use client'

import { useState } from 'react'
import { Download, Loader2, AlertTriangle, X, Trash2, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { QuotaState } from '@/lib/leadQuota'

interface Props {
  orgName: string
  orgSlug: string
  quota: QuotaState
}

export function PlanClient({ orgName, orgSlug, quota }: Props) {
  const [exporting, setExporting] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/export')
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Export failed' }))
        toast.error(error)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Pull filename from Content-Disposition if present
      const cd = res.headers.get('Content-Disposition') || ''
      const m = cd.match(/filename="([^"]+)"/)
      a.download = m?.[1] ?? `${orgSlug}-export.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Quota strip — shows current usage with a colour-coded bar
  const usageColor =
    quota.pct >= 100 ? '#ef4444' :
    quota.pct >= 80  ? '#f59e0b' :
    '#3d9191'

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-800">Plan & Data</h1>
        <p className="text-[8px] text-brand-400 font-semibold mt-0.5">
          Lead usage against your plan, plus tools to export everything or wipe and start fresh
        </p>
      </div>

      {/* Lead usage card */}
      <div className="bg-white rounded-2xl border border-brand-100 p-5 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">Lead usage</p>
            <p className="text-3xl font-bold text-brand-800 tabular-nums mt-1">
              {quota.count.toLocaleString('en-IN')}
              {quota.limit !== null && (
                <span className="text-base font-medium text-slate-400"> / {quota.limit.toLocaleString('en-IN')}</span>
              )}
            </p>
          </div>
          {quota.limit !== null && (
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums" style={{ color: usageColor }}>{quota.pct}%</p>
              <p className="text-[10px] text-slate-400">{(quota.remaining ?? 0).toLocaleString('en-IN')} remaining</p>
            </div>
          )}
        </div>

        {quota.limit !== null && (
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(100, quota.pct)}%`,
                background: usageColor,
              }}
            />
          </div>
        )}

        {quota.limit === null && (
          <p className="text-xs text-slate-500">No lead ceiling configured. Contact support to set up plan limits.</p>
        )}

        {quota.atLimit && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-red-800">Lead limit reached</p>
              <p className="text-red-700 mt-0.5">New lead creation is blocked. Export your data and reset, or contact support to raise your limit.</p>
            </div>
          </div>
        )}

        {!quota.atLimit && quota.pct >= 80 && quota.limit !== null && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              You&apos;re at <strong>{quota.pct}%</strong> of your plan. Consider upgrading or exporting & resetting to free up room.
            </p>
          </div>
        )}
      </div>

      {/* Export card — completely separate action, never deletes anything */}
      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-800">Export everything</p>
            <p className="text-xs text-slate-500 mt-1">
              Downloads a ZIP with leads, activities, employees, attendance, leaves, deadline log, and your full org config.
              <strong className="text-brand-700"> Nothing is deleted.</strong>
            </p>
            <ul className="text-[11px] text-slate-500 mt-2 space-y-0.5 list-disc list-inside">
              <li>leads.csv — every lead with all custom fields flattened to columns</li>
              <li>activities.csv — full audit trail with employee names</li>
              <li>employees.csv, attendance.csv, leaves.csv, sla_breaches.csv</li>
              <li>org_config.json — stages, roles, sources, field layouts, brand</li>
            </ul>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-brand-800 text-white hover:bg-brand-900 transition disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {exporting ? 'Building ZIP…' : 'Export'}
          </button>
        </div>
      </div>

      {/* Danger zone — separate explicit action */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/30 p-5">
        <div className="flex items-start gap-2 mb-2">
          <Trash2 size={14} className="text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Reset data</p>
            <p className="text-xs text-red-700 mt-0.5">
              Wipe leads (and optionally activities, breaches, layouts, pipeline, employees) so this org starts fresh.
              We recommend exporting first.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border border-red-300 text-red-700 hover:bg-red-100 transition"
        >
          <Trash2 size={13} />
          Reset data…
        </button>
      </div>

      {showResetModal && (
        <ResetModal orgName={orgName} orgSlug={orgSlug} onClose={() => setShowResetModal(false)} />
      )}
    </div>
  )
}

function ResetModal({ orgName, orgSlug, onClose }: { orgName: string; orgSlug: string; onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  // Sensible defaults: wipe transactional data, keep org-level config and team
  const [wipe, setWipe] = useState({
    leads:      true,    // disabled in UI — always true
    activities: true,
    breaches:   true,
    layouts:    false,
    pipeline:   false,
    employees:  false,
  })

  const matches = typed.trim() === orgSlug

  async function handleConfirm() {
    if (!matches || busy) return
    setBusy(true)
    const res = await fetch('/api/admin/reset-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmSlug: typed.trim(), wipe }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || 'Reset failed')
      setBusy(false)
      return
    }
    toast.success(`Reset complete — wiped: ${(data.wiped || []).join(', ')}`, { duration: 6000 })
    setBusy(false)
    onClose()
    // Hard reload so cached pages refresh
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Reset {orgName}&apos;s data</h2>
              <p className="text-xs text-slate-500 mt-0.5">This cannot be undone — export first if you need a backup.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="text-slate-400 hover:text-slate-700 p-1 transition disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">What to wipe</p>
            <div className="space-y-2">
              <CheckRow label="Leads" sub="All lead records (always wiped — that's the point)" checked disabled />
              <CheckRow label="Activities (audit trail)" sub="History of every action on every lead" checked={wipe.activities}
                onChange={v => setWipe(s => ({ ...s, activities: v }))} />
              <CheckRow label="Deadline breach log" sub="SLA breach history" checked={wipe.breaches}
                onChange={v => setWipe(s => ({ ...s, breaches: v }))} />
              <CheckRow label="Field layouts" sub="Your custom lead-field schema (advanced)" checked={wipe.layouts}
                onChange={v => setWipe(s => ({ ...s, layouts: v }))} />
              <CheckRow label="Pipeline & roles" sub="Stages, sub-stages, transition flow, custom roles, sources" checked={wipe.pipeline}
                onChange={v => setWipe(s => ({ ...s, pipeline: v }))} />
              <CheckRow label="Employees (excl. you)" sub="Removes every team member except yourself" checked={wipe.employees}
                onChange={v => setWipe(s => ({ ...s, employees: v }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Type <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-900">{orgSlug}</span> to confirm
            </label>
            <input
              type="text"
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              disabled={busy}
              placeholder={orgSlug}
              className="w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none transition font-mono"
              style={{ borderColor: matches ? '#ef4444' : '#cbd5e1' }}
            />
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!matches || busy}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: matches && !busy ? '#ef4444' : '#fca5a5', color: '#fff' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {busy ? 'Wiping…' : 'Reset now'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckRow({ label, sub, checked, onChange, disabled }: {
  label: string; sub: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <label className={`flex items-start gap-2.5 p-2 rounded-lg border ${
      disabled ? 'border-slate-100 bg-slate-50' : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${disabled ? 'text-slate-500' : 'text-slate-800'}`}>{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
      </div>
    </label>
  )
}
