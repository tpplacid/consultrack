'use client'

import { useState, useEffect } from 'react'
import { X, Lock, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  featureLabel: string
  featureKey: string
  description: string
  onClose: () => void
}

export function UpgradeModal({ featureLabel, featureKey, description, onClose }: Props) {
  const [subject, setSubject] = useState(`Request access to ${featureLabel}`)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setError('Please describe what you need.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message, type: 'upgrade_request', feature_key: featureKey }),
    })
    if (res.ok) {
      setDone(true)
    } else {
      const d = await res.json()
      setError(d.error || 'Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Gold header */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock size={14} className="text-amber-900" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Feature Locked</span>
              </div>
              <h2 className="text-lg font-bold text-white">{featureLabel}</h2>
              <p className="text-sm text-amber-100 mt-1 leading-relaxed">{description}</p>
            </div>
            <button onClick={onClose} className="text-amber-200 hover:text-white transition-colors flex-shrink-0 mt-0.5">
              <X size={18} />
            </button>
          </div>
        </div>

        {done ? (
          /* Success state */
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Request submitted!</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your request has been sent to the Consultrack team. We'll get back to you within 1 business day.
            </p>
            <a href="/admin/support" onClick={onClose}
              className="mt-6 w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">
              View your support tickets →
            </a>
            <button onClick={onClose} className="mt-2 w-full py-2 text-slate-400 hover:text-slate-600 text-sm transition">
              Close
            </button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Raise a request to unlock this feature for your organisation.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Tell us about your use case and when you'd like to get started…"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 text-slate-700 resize-none"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition disabled:opacity-60">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={13} />}
                {loading ? 'Sending…' : 'Send Request'}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold transition">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
