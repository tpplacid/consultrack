'use client'

import { useState } from 'react'

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
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 p-2">
            <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="black"/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="black"/>
            </svg>
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
