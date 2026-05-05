'use client'

import { useState } from 'react'
import { LogIn, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function EnterOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleEnter(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const res  = await fetch('/api/superadmin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      // Open magic link in new tab — logs in as the org admin
      window.open(data.url, '_blank', 'noopener')
      toast.success(`Entering ${orgName} as ${data.email}`)
    } catch {
      toast.error('Failed to generate login link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleEnter}
      title={`Enter ${orgName} as admin`}
      className="transition-colors flex-shrink-0 p-1 opacity-0 group-hover:opacity-100"
      style={{ color: 'var(--sa-text-muted)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-accent)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)' }}
    >
      {loading
        ? <Loader2 size={12} className="animate-spin" />
        : <LogIn size={12} />
      }
    </button>
  )
}
