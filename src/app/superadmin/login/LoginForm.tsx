'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'

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
      // picks up the new cookie. router.push does client-side navigation only
      // and can miss the cookie in some browsers.
      window.location.href = '/superadmin/orgs'
      return
    } else {
      const { error } = await res.json()
      setError(error || 'Invalid password')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4">
            <Zap size={18} className="text-black" fill="black" />
          </div>
          <p className="text-white font-semibold text-lg tracking-tight">Consultrack</p>
          <p className="text-neutral-600 text-xs mt-1">Super Admin</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111] p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
                placeholder="••••••••"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
