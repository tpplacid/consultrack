'use client'

import { useState } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// One-click sandbox enter button — pinned in the SA nav.
// First click auto-creates the sandbox org if it doesn't exist.
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
      className="w-full group relative overflow-hidden rounded-xl transition-all"
      style={{
        border: '2px solid var(--sa-accent-2)',
        background: 'color-mix(in srgb, var(--sa-accent-2) 12%, var(--sa-surface-strong))',
        boxShadow: '4px 4px 0 0 var(--sa-accent-2)',
        transform: 'translate(-2px,-2px)',
        color: 'var(--sa-text)',
      }}
    >
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'color-mix(in srgb, var(--sa-accent-2) 25%, transparent)' }}>
          {busy
            ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--sa-accent-2)' }} />
            : <FlaskConical size={13} style={{ color: 'var(--sa-accent-2)' }} />
          }
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-black tracking-wide" style={{ color: 'var(--sa-text)' }}>SANDBOX</p>
          <p className="text-[9px] font-medium" style={{ color: 'var(--sa-text-secondary)' }}>{busy ? 'Launching…' : 'Quick enter →'}</p>
        </div>
      </div>
    </button>
  )
}
