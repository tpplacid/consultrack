'use client'

import { useState } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }

// Single-click sandbox enter — auto-creates the org if missing.
// Restrained amber accent (sandbox semantics) on a clean surface card.
export function SandboxLauncher() {
  const [busy, setBusy] = useState(false)

  async function enter() {
    setBusy(true)
    try {
      const res = await fetch('/api/superadmin/sandbox', { method: 'GET' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Failed to enter sandbox')
        return
      }
      window.open(data.url, '_blank', 'noopener')
      toast.success(`Entering ${data.orgName}…`)
    } catch {
      toast.error('Failed to launch sandbox')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={enter}
      disabled={busy}
      title="Open the SA sandbox org in a new tab — instant login, safe to break things"
      className="w-full group rounded-lg transition-colors text-left"
      style={{
        background: 'var(--sa-surface)',
        border: '1px solid var(--sa-border)',
        boxShadow: 'var(--sa-shadow-sm)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-hover)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface)' }}
    >
      <div className="px-3 py-2.5 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'color-mix(in srgb, var(--sa-accent-2) 15%, transparent)' }}
        >
          {busy
            ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--sa-accent-2)' }} />
            : <FlaskConical size={13} style={{ color: 'var(--sa-accent-2)' }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.18em] uppercase" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>Sandbox</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--sa-text)' }}>{busy ? 'Launching…' : 'Quick enter →'}</p>
        </div>
      </div>
    </button>
  )
}
