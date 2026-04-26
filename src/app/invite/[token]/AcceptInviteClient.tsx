'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<string, string> = { ad: 'Admin', tl: 'Team Lead', counsellor: 'Counsellor', telesales: 'Telesales' }

interface Props {
  token: string
  orgName: string
  orgSlug: string
  orgLogoUrl: string | null
  prefillName: string
  prefillEmail: string
  role: string
}

export default function AcceptInviteClient({ token, orgName, orgSlug, orgLogoUrl, prefillName, prefillEmail, role }: Props) {
  const router = useRouter()
  const [name, setName] = useState(prefillName)
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    // Redirect to org login page
    router.push(orgSlug ? `/${orgSlug}` : '/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Consultrack brand */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <img
              src="/Consultrack Logo.png"
              alt="Consultrack"
              className="h-7 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-slate-700 font-bold text-base">Consultrack</span>
          </div>
          {/* Org logo / name */}
          {orgLogoUrl ? (
            <img src={orgLogoUrl} alt={orgName} className="h-14 object-contain mx-auto mb-3" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-800 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-2xl uppercase">{orgName.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-slate-900 font-bold text-xl">You're invited!</h1>
          <p className="text-slate-500 text-sm mt-1">
            Join <span className="font-semibold text-slate-700">{orgName}</span> as{' '}
            <span className="font-semibold text-teal-600">{ROLE_LABELS[role] || role}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                readOnly={!!prefillEmail}
                className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${prefillEmail ? 'bg-slate-50 text-slate-500' : ''}`}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Repeat password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
