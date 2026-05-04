'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

async function lookupOrg(slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orgs')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return data
}

type Mode = 'workspace' | 'org-login' | 'email'

export default function LoginPage() {
  const router = useRouter()
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'consultrackk.vercel.app'
  const [mode, setMode] = useState<Mode>('workspace')
  const [slug, setSlug] = useState('')
  const [org, setOrg] = useState<{ name: string; slug: string; logo_url: string | null } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleWorkspace(e: React.FormEvent) {
    e.preventDefault()
    const s = slug.trim().toLowerCase()
    if (!s) return
    setLoading(true)
    const found = await lookupOrg(s)
    if (!found) {
      toast.error(`No workspace found for "${s}". Check the URL and try again.`)
      setLoading(false)
      return
    }
    setOrg(found)
    setMode('org-login')
    setLoading(false)
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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">

        {/* Consultrack brand — hidden on org-login */}
        {mode !== 'org-login' && (
          <div className="text-center mb-8">
            <svg width="80" height="60" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-1">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="#0f172a"/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="#0f172a"/>
            </svg>
            <p className="text-2xl font-bold text-slate-900">Consultrack</p>
            <p className="text-slate-500 text-sm mt-0.5">Move fast. Close faster.</p>
          </div>
        )}

        {/* Org brand — shown on org-login */}
        {mode === 'org-login' && org && (
          <div className="text-center mb-8">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="h-16 object-contain mx-auto mb-3" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-800 flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-3xl uppercase">{org.name.charAt(0)}</span>
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900">{org.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">Sign in to your workspace</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Workspace finder */}
          {mode === 'workspace' && (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-1">Find your workspace</h2>
              <p className="text-sm text-slate-500 mb-5">Enter your organisation's URL to sign in</p>
              <form onSubmit={handleWorkspace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Workspace URL</label>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-transparent">
                    <span className="px-3 py-2.5 text-sm text-slate-400 border-r border-slate-200 bg-slate-50 shrink-0 whitespace-nowrap">{hostname}/</span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none min-w-0"
                      placeholder="your-org"
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-60">
                  {loading ? 'Looking up…' : 'Continue'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => setMode('email')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition">
                  Sign in with email instead
                </button>
              </div>
            </>
          )}

          {/* Org-specific login */}
          {mode === 'org-login' && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-60">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => { setMode('workspace'); setOrg(null) }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition">
                  ← Switch workspace
                </button>
              </div>
            </>
          )}

          {/* Direct email login */}
          {mode === 'email' && (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-1">Sign in</h2>
              <p className="text-sm text-slate-500 mb-5">Use your account credentials</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    placeholder="you@example.com" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-60">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => setMode('workspace')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition">
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
