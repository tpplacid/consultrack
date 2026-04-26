'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

type Employee = { id: string; name: string; email: string; role: string; is_active: boolean; created_at: string }
type Invite = { id: string; token: string; email: string | null; name: string | null; role: string; used_at: string | null; expires_at: string; created_at: string; link: string }
type Features = { lead_crm: boolean; attendance: boolean; meta: boolean }
type Org = { id: string; name: string; slug: string; logo_url: string | null; features?: Features; created_at: string }

const ROLES = ['ad', 'tl', 'counsellor', 'telesales']
const ROLE_LABELS: Record<string, string> = { ad: 'Admin', tl: 'Team Lead', counsellor: 'Counsellor', telesales: 'Telesales' }

const DEFAULT_FEATURES: Features = { lead_crm: true, attendance: true, meta: true }

const FEATURE_CONFIG = [
  {
    key: 'lead_crm' as const,
    label: 'Lead CRM',
    description: 'Access to lead pipeline, manual lead creation and management',
  },
  {
    key: 'attendance' as const,
    label: 'Attendance & Leave Management',
    description: 'Clock-in/out, wifi verification, leave requests and approvals',
  },
  {
    key: 'meta' as const,
    label: 'Meta / Facebook Integration',
    description: 'Automatically import leads from Meta lead forms',
  },
]

interface Props {
  org: Org
  employees: Employee[]
  invites: Invite[]
}

export default function OrgDetailClient({ org, employees: initialEmployees, invites: initialInvites }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [invites, setInvites] = useState(initialInvites)
  const [tab, setTab] = useState<'employees' | 'invites' | 'settings'>('employees')

  // Settings state
  const [orgName, setOrgName] = useState(org.name)
  const [orgSlug, setOrgSlug] = useState(org.slug)
  const [features, setFeatures] = useState<Features>(org.features ?? DEFAULT_FEATURES)
  const [savingSettings, setSavingSettings] = useState(false)

  // Add employee
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [empName, setEmpName] = useState('')
  const [empEmail, setEmpEmail] = useState('')
  const [empPassword, setEmpPassword] = useState('')
  const [empRole, setEmpRole] = useState('counsellor')
  const [addingEmp, setAddingEmp] = useState(false)
  const [empError, setEmpError] = useState('')

  // Add invite
  const [showAddInvite, setShowAddInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invRole, setInvRole] = useState('counsellor')
  const [addingInv, setAddingInv] = useState(false)
  const [invError, setInvError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    const res = await fetch(`/api/superadmin/orgs/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: orgName, slug: orgSlug, features }),
    })
    if (res.ok) {
      toast.success('Organisation updated')
    } else {
      const d = await res.json()
      toast.error(d.error || 'Failed to save')
    }
    setSavingSettings(false)
  }

  function toggleFeature(key: keyof Features) {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    setAddingEmp(true)
    setEmpError('')
    const res = await fetch('/api/superadmin/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, name: empName, email: empEmail, password: empPassword, role: empRole }),
    })
    const data = await res.json()
    if (!res.ok) {
      setEmpError(data.error)
    } else {
      setEmployees(prev => [data.employee, ...prev])
      setShowAddEmployee(false)
      setEmpName(''); setEmpEmail(''); setEmpPassword(''); setEmpRole('counsellor')
      toast.success('Employee added')
    }
    setAddingEmp(false)
  }

  async function handleAddInvite(e: React.FormEvent) {
    e.preventDefault()
    setAddingInv(true)
    setInvError('')
    const res = await fetch('/api/superadmin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, email: invEmail || null, name: invName || null, role: invRole }),
    })
    const data = await res.json()
    if (!res.ok) {
      setInvError(data.error)
    } else {
      setInvites(prev => [data.invite, ...prev])
      setShowAddInvite(false)
      setInvEmail(''); setInvName(''); setInvRole('counsellor')
    }
    setAddingInv(false)
  }

  function copyLink(token: string, link: string) {
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/superadmin/orgs" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Organisations
        </Link>

        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{orgName}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{orgSlug}.vercel.app/{orgSlug}</p>
          </div>
          <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
            </svg>
            Open login
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6 w-fit">
          {(['employees', 'invites', 'settings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition capitalize ${
                tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {t === 'employees' ? `Employees (${employees.length})` : t === 'invites' ? `Invites (${invites.length})` : 'Settings'}
            </button>
          ))}
        </div>

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Org details */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300">Organisation details</h2>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Name</label>
                <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">URL slug</label>
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                  <span className="px-3 py-2.5 text-sm text-slate-500 border-r border-slate-700 shrink-0">consultrackk.vercel.app/</span>
                  <input type="text" required value={orgSlug}
                    onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2.5 bg-transparent text-sm text-white focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Feature flags */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-300">Feature permissions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Control which modules this organisation can access</p>
              </div>
              <div className="space-y-3">
                {FEATURE_CONFIG.map(f => (
                  <div key={f.key} className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{f.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{f.description}</p>
                    </div>
                    <button type="button" onClick={() => toggleFeature(f.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                        features[f.key] ? 'bg-teal-500' : 'bg-slate-700'
                      }`}>
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                        features[f.key] ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={savingSettings}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
              {savingSettings ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── EMPLOYEES TAB ── */}
        {tab === 'employees' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowAddEmployee(v => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add Employee
              </button>
            </div>

            {showAddEmployee && (
              <form onSubmit={handleAddEmployee} className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300">New employee</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Full name</label>
                    <input type="text" required value={empName} onChange={e => setEmpName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Role</label>
                    <select value={empRole} onChange={e => setEmpRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input type="email" required value={empEmail} onChange={e => setEmpEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input type="text" required value={empPassword} onChange={e => setEmpPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {empError && <p className="text-xs text-red-400">{empError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={addingEmp}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
                    {addingEmp ? 'Adding…' : 'Add'}
                  </button>
                  <button type="button" onClick={() => setShowAddEmployee(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {employees.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No employees yet.</p>
            ) : (
              <div className="space-y-2">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-white text-sm font-medium">{emp.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{emp.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        emp.role === 'ad' ? 'bg-teal-900 text-teal-300' :
                        emp.role === 'tl' ? 'bg-blue-900 text-blue-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {ROLE_LABELS[emp.role] || emp.role}
                      </span>
                      {!emp.is_active && <span className="text-xs text-red-400">Inactive</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INVITES TAB ── */}
        {tab === 'invites' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowAddInvite(v => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Generate Invite Link
              </button>
            </div>

            {showAddInvite && (
              <form onSubmit={handleAddInvite} className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300">Generate invite link</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Name (optional)</label>
                    <input type="text" value={invName} onChange={e => setInvName(e.target.value)} placeholder="Pre-fill name"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Role</label>
                    <select value={invRole} onChange={e => setInvRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email (optional)</label>
                  <input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="Pre-fill email"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {invError && <p className="text-xs text-red-400">{invError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={addingInv}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
                    {addingInv ? 'Generating…' : 'Generate'}
                  </button>
                  <button type="button" onClick={() => setShowAddInvite(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {invites.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No invite links yet.</p>
            ) : (
              <div className="space-y-2">
                {invites.map(inv => {
                  const isUsed = !!inv.used_at
                  const isExpired = !isUsed && new Date(inv.expires_at) < new Date()
                  return (
                    <div key={inv.id} className={`bg-slate-900 border rounded-xl px-4 py-3 ${
                      isUsed ? 'border-slate-800 opacity-60' : isExpired ? 'border-red-900' : 'border-slate-800'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                              inv.role === 'ad' ? 'bg-teal-900 text-teal-300' :
                              inv.role === 'tl' ? 'bg-blue-900 text-blue-300' :
                              'bg-slate-800 text-slate-400'
                            }`}>{ROLE_LABELS[inv.role] || inv.role}</span>
                            {inv.name && <span className="text-slate-300 text-xs">{inv.name}</span>}
                            {inv.email && <span className="text-slate-400 text-xs">{inv.email}</span>}
                            {isUsed && <span className="text-green-400 text-xs">✓ Used</span>}
                            {isExpired && <span className="text-red-400 text-xs">Expired</span>}
                          </div>
                          <p className="text-slate-500 text-xs font-mono truncate">{inv.link}</p>
                        </div>
                        {!isUsed && !isExpired && (
                          <button onClick={() => copyLink(inv.token, inv.link)}
                            className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition">
                            {copiedToken === inv.token ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs mt-1">
                        {isUsed
                          ? `Used ${formatDistanceToNow(new Date(inv.used_at!), { addSuffix: true })}`
                          : `Expires ${formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
