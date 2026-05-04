'use client'

import { useState } from 'react'
import { Loader2, Trash2, AlertTriangle, X } from 'lucide-react'

interface Props {
  orgName: string
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function DeleteOrgModal({ orgName, onCancel, onConfirm }: Props) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const matches = typed.trim() === orgName

  async function handleConfirm() {
    if (!matches || busy) return
    setBusy(true)
    try { await onConfirm() }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.08), rgba(0,0,0,0.95))' }}>

        <div className="p-5 border-b border-white/[0.06] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Delete organisation</h2>
              <p className="text-xs text-neutral-500 mt-0.5">This cannot be undone.</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={busy}
            className="text-neutral-600 hover:text-white p-1 transition-colors disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2 text-sm text-neutral-400">
            <p>This will permanently remove:</p>
            <ul className="space-y-1 text-xs text-neutral-500 list-disc list-inside ml-1">
              <li>The org and all its settings</li>
              <li>All employees and their auth accounts</li>
              <li>All leads, activities, and deadline breaches</li>
              <li>All pipeline configuration, roles, and templates</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-2">
              Type <span className="font-bold text-white font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">{orgName}</span> to confirm
            </label>
            <input
              type="text"
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              disabled={busy}
              placeholder={orgName}
              className="w-full px-3 py-2.5 bg-black/40 border-2 rounded-lg text-sm text-white placeholder-neutral-700 focus:outline-none transition font-mono"
              style={{ borderColor: matches ? '#ef4444' : 'rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-2">
          <button onClick={onCancel} disabled={busy}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!matches || busy}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: matches && !busy ? '#ef4444' : 'rgba(239,68,68,0.2)', color: '#fff' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {busy ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </div>
  )
}
