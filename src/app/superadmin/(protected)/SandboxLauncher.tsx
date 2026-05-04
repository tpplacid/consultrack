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
      className="w-full group relative overflow-hidden rounded-xl border-2 transition-all"
      style={{
        borderColor: '#f59e0b',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.04) 100%)',
        boxShadow: '4px 4px 0 0 #f59e0b',
        transform: 'translate(-2px,-2px)',
      }}
    >
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.2)' }}>
          {busy
            ? <Loader2 size={13} className="animate-spin text-amber-400" />
            : <FlaskConical size={13} className="text-amber-400" />
          }
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-bold text-white tracking-wide">SANDBOX</p>
          <p className="text-[9px] text-amber-200/60 font-medium">{busy ? 'Launching…' : 'Quick enter →'}</p>
        </div>
      </div>
    </button>
  )
}
