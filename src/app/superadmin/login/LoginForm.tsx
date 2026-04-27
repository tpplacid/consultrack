'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      router.push('/superadmin/orgs')
    } else {
      const { error } = await res.json()
      setError(error || 'Invalid password')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/Consultrack Logo.png" alt="Consultrack" className="h-10 object-contain mx-auto mb-3"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <p className="text-white font-bold text-xl">Consultrack</p>
          <p className="text-slate-400 text-sm mt-0.5">Super Admin Access</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Admin Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
