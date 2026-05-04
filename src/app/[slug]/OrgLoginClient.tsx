'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { KeyRound, ArrowLeft } from 'lucide-react'

interface Props {
  orgName: string
  orgSlug: string
  logoUrl: string | null
}

export default function OrgLoginClient({ orgName, orgSlug, logoUrl }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Password reset via SA-generated code
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetting, setResetting] = useState(false)

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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setResetting(true)
    const res = await fetch('/api/auth/use-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Failed to reset password')
    } else {
      toast.success('Password reset! Signing you in…')
      // Auto sign-in with new password
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: resetEmail, password: newPassword })
      if (!error) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setResetMode(false)
        setEmail(resetEmail)
      }
    }
    setResetting(false)
  }

  const INPUT = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent'
  const LABEL = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">

        {/* Org brand */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={orgName} className="h-16 object-contain mx-auto mb-3" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-800 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-3xl uppercase">{orgName.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-900">{orgName}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {resetMode ? 'Reset your password' : 'Sign in to your workspace'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!resetMode ? (
            /* ── Normal login ── */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={LABEL}>Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  autoFocus className={INPUT} placeholder="you@example.com" />
              </div>
              <div>
                <label className={LABEL}>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className={INPUT} placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-60">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              {/* Reset with code link */}
              <button
                type="button"
                onClick={() => { setResetMode(true); setResetEmail(email) }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition mt-1"
              >
                <KeyRound size={11} />
                Have a reset code from your admin?
              </button>
            </form>
          ) : (
            /* ── Reset password via SA code ── */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setResetMode(false)}
                  className="text-slate-400 hover:text-slate-600 transition">
                  <ArrowLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-brand-400" />
                  Reset with admin code
                </p>
              </div>

              <div>
                <label className={LABEL}>Your email</label>
                <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  className={INPUT} placeholder="you@example.com" />
              </div>
              <div>
                <label className={LABEL}>6-digit reset code</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${INPUT} font-mono tracking-widest text-center text-lg`}
                  placeholder="000000"
                  maxLength={6}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Ask your superadmin to generate this code for you.
                </p>
              </div>
              <div>
                <label className={LABEL}>New password</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className={INPUT} placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className={LABEL}>Confirm new password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className={INPUT} placeholder="Repeat password" />
              </div>
              <button type="submit" disabled={resetting || resetCode.length !== 6}
                className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition disabled:opacity-60">
                {resetting ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}

          {!resetMode && (
            <div className="mt-4 text-center">
              <a href="/login" className="text-xs text-slate-400 hover:text-slate-600 transition">
                ← Switch workspace
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          {resetMode
            ? 'Contact your superadmin if you need a reset code.'
            : 'Forgot your workspace URL? Contact your admin.'}
        </p>
      </div>
    </div>
  )
}
