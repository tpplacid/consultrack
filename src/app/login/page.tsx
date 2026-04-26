'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'workspace' | 'email'>('workspace')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function handleWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (slug.trim()) router.push(`/${slug.trim().toLowerCase()}`)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4">
      <div className="w-full max-w-sm">
        {/* Consultrack brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-brand-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 013 10c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-slate-900">Consultrack</span>
          </div>
          <p className="text-slate-500 text-sm">Admissions CRM for education consultancies</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {mode === 'workspace' ? (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-1">Find your workspace</h2>
              <p className="text-sm text-slate-500 mb-5">Enter your organisation's URL to sign in</p>
              <form onSubmit={handleWorkspace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Workspace URL</label>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-transparent">
                    <span className="px-3 py-2.5 text-sm text-slate-400 border-r border-slate-200 bg-slate-50 shrink-0">consultrack.app/</span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                      placeholder="your-org"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition"
                >
                  Continue
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setMode('email')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  Sign in with email instead
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-1">Sign in</h2>
              <p className="text-sm text-slate-500 mb-5">Use your account credentials</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
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
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setMode('workspace')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  ← Back to workspace
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Forgot your workspace URL? Contact your admin.
        </p>
      </div>
    </div>
  )
}
