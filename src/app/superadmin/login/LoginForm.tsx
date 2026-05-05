'use client'

import { useState } from 'react'

const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }

export default function SuperAdminLoginPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/superadmin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      // Hard redirect — forces full server re-render so the protected layout
      // picks up the new cookie. router.push is client-only and can miss it.
      window.location.href = '/superadmin/orgs'
      return
    } else {
      const { error } = await res.json()
      setError(error || 'Invalid password')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ color: 'var(--sa-text)', zIndex: 10 }}>
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 p-2"
            style={{ background: 'var(--sa-accent)', boxShadow: 'var(--sa-shadow-md)' }}
          >
            <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="white"/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="white"/>
            </svg>
          </div>
          <p className="font-semibold text-lg tracking-tight" style={{ color: 'var(--sa-text)' }}>Consultrack</p>
          <p className="text-[10px] mt-1.5 tracking-[0.22em] uppercase" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>
            Super Admin
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'color-mix(in srgb, var(--sa-surface) 92%, transparent)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--sa-border)',
            boxShadow: 'var(--sa-shadow-lg)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase mb-1.5" style={{ ...MONO, color: 'var(--sa-text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm transition focus:outline-none"
                style={{
                  background: 'var(--sa-surface)',
                  border: '1px solid var(--sa-border)',
                  color: 'var(--sa-text)',
                }}
                placeholder="••••••••"
                autoFocus
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--sa-accent)'; e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--sa-accent) 18%, transparent)` }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--sa-border)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-md" style={{ background: 'var(--sa-danger-bg)', color: 'var(--sa-danger)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--sa-accent)', color: 'var(--sa-text-on-accent)', boxShadow: 'var(--sa-shadow-sm)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--sa-accent-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-accent)' }}
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-[10px] text-center mt-6 tracking-[0.18em] uppercase" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>
          Restricted access
        </p>
      </div>
    </div>
  )
}
