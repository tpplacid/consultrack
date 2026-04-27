'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type AdminOption = 'none' | 'create' | 'invite'

export default function NewOrgClient() {
  const router = useRouter()

  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [adminOption, setAdminOption] = useState<AdminOption>('create')

  // Create admin fields
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  // Invite-only fields
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ orgId: string; inviteLink?: string; adminEmail?: string } | null>(null)

  function deriveSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/superadmin/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgName,
        slug: slug || deriveSlug(orgName),
        adminOption,
        adminName,
        adminEmail,
        adminPassword,
        inviteEmail,
        inviteName,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
    } else {
      setResult(data)
    }
    setLoading(false)
  }

  if (result) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <div className="max-w-lg mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-900 border border-teal-700 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-teal-400" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Organisation Created</h2>
            <p className="text-slate-400 text-sm mb-6">
              {orgName} is ready. {result.adminEmail ? `Admin account created for ${result.adminEmail}.` : ''}
            </p>

            {result.inviteLink && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Invite Link</p>
                <p className="text-teal-300 text-xs break-all font-mono">{result.inviteLink}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(result.inviteLink!)}
                  className="mt-3 text-xs text-slate-400 hover:text-white transition"
                >
                  Copy to clipboard
                </button>
              </div>
            )}

            {result.adminEmail && !result.inviteLink && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Admin Credentials</p>
                <p className="text-slate-300 text-sm">Email: <span className="text-white font-mono">{result.adminEmail}</span></p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link
                href={`/superadmin/orgs/${result.orgId}`}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition"
              >
                Manage Org
              </Link>
              <Link
                href="/superadmin/orgs/new"
                onClick={() => setResult(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition"
              >
                Create Another
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-lg mx-auto">
        {/* Back */}
        <Link href="/superadmin/orgs" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Organisations
        </Link>

        <h1 className="text-2xl font-bold text-white mb-8">New Organisation</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Org details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Organisation details</h2>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={e => {
                  setOrgName(e.target.value)
                  setSlug(deriveSlug(e.target.value))
                }}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Apex Admissions"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">URL slug</label>
              <div className="flex items-center gap-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                <span className="px-3 py-2.5 text-sm text-slate-500 border-r border-slate-700 shrink-0">consultrack.vercel.app/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 px-3 py-2.5 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  placeholder="apex-admissions"
                />
              </div>
            </div>
          </div>

          {/* Admin account */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Admin account</h2>

            {/* Option selector */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'create', label: 'Create account' },
                { value: 'invite', label: 'Send invite link' },
                { value: 'none', label: 'Skip for now' },
              ] as { value: AdminOption; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAdminOption(opt.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    adminOption === opt.value
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {adminOption === 'create' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Full name</label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="admin@apexadmissions.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                  <input
                    type="text"
                    required
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Set a strong password"
                  />
                  <p className="text-xs text-slate-500 mt-1">You'll share these credentials with the admin.</p>
                </div>
              </div>
            )}

            {adminOption === 'invite' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Name (optional)</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Pre-fill admin's name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email (optional)</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="admin@apexadmissions.com"
                  />
                </div>
                <p className="text-xs text-slate-500">An invite link will be generated. Share it with the admin — they set their own password.</p>
              </div>
            )}

            {adminOption === 'none' && (
              <p className="text-xs text-slate-500">You can add employees from the org management page later.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create Organisation'}
          </button>
        </form>
      </div>
    </div>
  )
}
