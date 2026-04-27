'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Copy, Check, ExternalLink,
  Users, Mail, Link2, Loader2, Radio,
} from 'lucide-react'
import { PALETTES, DEFAULT_PALETTE } from '@/lib/orgTheme'

type Employee = { id: string; name: string; email: string; role: string; is_active: boolean; created_at: string }
type Invite = { id: string; token: string; email: string | null; name: string | null; role: string; used_at: string | null; expires_at: string; created_at: string; link: string }
type Features = {
  lead_crm: boolean; sla: boolean; pipeline: boolean
  roles: boolean; attendance: boolean; meta: boolean
}
type MetaConfig = { page_id?: string; access_token?: string }
type OrgRole = { key: string; label: string }
type Org = { id: string; name: string; slug: string; logo_url: string | null; features?: Features; brand_palette?: string; meta_config?: MetaConfig; is_live?: boolean; created_at: string }

const ROLE_COLORS: Record<string, string> = {
  ad: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
  tl: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  counsellor: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  telesales: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
}
const ROLE_COLOR_FALLBACK = 'bg-slate-500/15 text-slate-300 border-slate-500/20'

const DEFAULT_FEATURES: Features = { lead_crm: true, sla: true, pipeline: true, roles: true, attendance: true, meta: true }

const FEATURE_CONFIG: { key: keyof Features; label: string; description: string; color: string }[] = [
  { key: 'lead_crm',   label: 'Lead CRM',           description: 'Dashboard, lead pipeline, bulk CSV upload, offline approvals', color: '#14b8a6' },
  { key: 'pipeline',   label: 'Pipeline Config',     description: 'Custom stages, sub-stages, and transition flow editor',       color: '#8b5cf6' },
  { key: 'sla',        label: 'Deadline Breach',     description: 'Stage-level deadline tracking with breach alerts and logs',   color: '#f59e0b' },
  { key: 'attendance', label: 'Attendance & Leaves', description: 'Clock-in/out with wifi verification, leave approvals',       color: '#3b82f6' },
  { key: 'roles',      label: 'Role Management',     description: 'Custom roles with granular access permissions',               color: '#ec4899' },
  { key: 'meta',       label: 'Meta Integration',    description: 'Auto-import leads from Facebook & Instagram ad campaigns',   color: '#6366f1' },
]

interface Props {
  org: Org
  employees: Employee[]
  invites: Invite[]
  orgRoles: OrgRole[]
}

const INPUT = 'w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition'
const BTN_PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-neutral-200 transition-all disabled:opacity-40'
const BTN_GHOST = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-neutral-500 hover:text-white bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all'

export default function OrgDetailClient({ org, employees: initialEmployees, invites: initialInvites, orgRoles }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [invites, setInvites] = useState(initialInvites)
  const [tab, setTab] = useState<'employees' | 'invites' | 'settings'>('employees')

  // Derived role list — org-specific roles, fall back to admin-only for new orgs
  const roleList: OrgRole[] = orgRoles.length > 0 ? orgRoles : [{ key: 'ad', label: 'Admin/Director' }]
  const roleLabelMap: Record<string, string> = Object.fromEntries(roleList.map(r => [r.key, r.label]))
  const defaultRole = roleList[roleList.length - 1].key

  const [orgName, setOrgName] = useState(org.name)
  const [orgSlug, setOrgSlug] = useState(org.slug)
  const [isLive, setIsLive] = useState(org.is_live ?? true)
  const [features, setFeatures] = useState<Features>(org.features ?? DEFAULT_FEATURES)
  const [brandPalette, setBrandPalette] = useState(org.brand_palette ?? DEFAULT_PALETTE)
  const [metaPageId, setMetaPageId] = useState(org.meta_config?.page_id ?? '')
  const [metaAccessToken, setMetaAccessToken] = useState(org.meta_config?.access_token ?? '')
  const [savingSettings, setSavingSettings] = useState(false)

  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [empName, setEmpName] = useState('')
  const [empEmail, setEmpEmail] = useState('')
  const [empPassword, setEmpPassword] = useState('')
  const [empRole, setEmpRole] = useState(defaultRole)
  const [addingEmp, setAddingEmp] = useState(false)
  const [empError, setEmpError] = useState('')

  const [showAddInvite, setShowAddInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invRole, setInvRole] = useState(defaultRole)
  const [addingInv, setAddingInv] = useState(false)
  const [invError, setInvError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    const res = await fetch(`/api/superadmin/orgs/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgName,
        slug: orgSlug,
        is_live: isLive,
        features,
        brand_palette: brandPalette,
        meta_config: { page_id: metaPageId || undefined, access_token: metaAccessToken || undefined },
      }),
    })
    if (res.ok) toast.success('Organisation updated')
    else { const d = await res.json(); toast.error(d.error || 'Failed to save') }
    setSavingSettings(false)
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    setAddingEmp(true); setEmpError('')
    const res = await fetch('/api/superadmin/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, name: empName, email: empEmail, password: empPassword, role: empRole }),
    })
    const data = await res.json()
    if (!res.ok) { setEmpError(data.error) }
    else {
      setEmployees(prev => [data.employee, ...prev])
      setShowAddEmployee(false)
      setEmpName(''); setEmpEmail(''); setEmpPassword(''); setEmpRole(defaultRole)
      toast.success('Employee added')
    }
    setAddingEmp(false)
  }

  async function handleAddInvite(e: React.FormEvent) {
    e.preventDefault()
    setAddingInv(true); setInvError('')
    const res = await fetch('/api/superadmin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, email: invEmail || null, name: invName || null, role: invRole }),
    })
    const data = await res.json()
    if (!res.ok) { setInvError(data.error) }
    else {
      setInvites(prev => [data.invite, ...prev])
      setShowAddInvite(false)
      setInvEmail(''); setInvName(''); setInvRole(defaultRole)
    }
    setAddingInv(false)
  }

  function copyLink(token: string, link: string) {
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const enabledCount = Object.values(features).filter(Boolean).length

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: '#000' }}>
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link href="/superadmin/orgs"
          className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={13} />
          All organisations
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            {org.logo_url ? (
              <img src={org.logo_url} alt={orgName}
                className="w-11 h-11 rounded-xl object-contain flex-shrink-0 bg-white/[0.05]" />
            ) : (
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-base flex-shrink-0 bg-white/[0.06] text-white">
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white tracking-tight">{orgName}</h1>
                {isLive
                  ? <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Radio size={7} className="fill-emerald-400" />LIVE
                    </span>
                  : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/[0.05] text-neutral-600 border border-white/[0.06]">
                      OFFLINE
                    </span>
                }
              </div>
              <p className="text-neutral-600 text-sm mt-0.5 flex items-center gap-1.5">
                <span>/{orgSlug}</span>
                <span className="text-neutral-800">·</span>
                <span>{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
                <span className="text-neutral-800">·</span>
                <span>{enabledCount}/6 features</span>
              </p>
            </div>
          </div>
          <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer"
            className={BTN_GHOST}>
            <ExternalLink size={12} />
            Open login
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg mb-6 w-fit border border-white/[0.06] bg-white/[0.02]">
          {(['employees', 'invites', 'settings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? 'text-white bg-white/[0.1] border border-white/[0.1]'
                  : 'text-neutral-600 hover:text-white'
              }`}
            >
              {t === 'employees' ? `Employees (${employees.length})` : t === 'invites' ? `Invites (${invites.length})` : 'Settings'}
            </button>
          ))}
        </div>

        {/* ── EMPLOYEES ── */}
        {tab === 'employees' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowAddEmployee(v => !v)}
                className={BTN_PRIMARY}
                style={{ background: '#fff', color: '#000' }}>
                <Plus size={14} />Add Employee
              </button>
            </div>

            {showAddEmployee && (
              <form onSubmit={handleAddEmployee}
                className="rounded-2xl p-5 mb-4 space-y-3 border border-white/[0.08]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <h3 className="text-sm font-semibold text-slate-300 mb-1">New employee</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Full name</label>
                    <input type="text" required value={empName} onChange={e => setEmpName(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Role</label>
                    <select value={empRole} onChange={e => setEmpRole(e.target.value)} className={INPUT}>
                      {roleList.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Email</label>
                  <input type="email" required value={empEmail} onChange={e => setEmpEmail(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Password</label>
                  <input type="text" required value={empPassword} onChange={e => setEmpPassword(e.target.value)} className={INPUT} />
                </div>
                {empError && <p className="text-xs text-red-400">{empError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={addingEmp}
                    className={BTN_PRIMARY}
                    style={{ background: '#fff', color: '#000' }}>
                    {addingEmp ? <Loader2 size={13} className="animate-spin" /> : null}
                    {addingEmp ? 'Adding…' : 'Add employee'}
                  </button>
                  <button type="button" onClick={() => setShowAddEmployee(false)} className={BTN_GHOST}>Cancel</button>
                </div>
              </form>
            )}

            {employees.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/[0.05]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <Users size={20} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No employees yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map(emp => (
                  <div key={emp.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3 border border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.07)', color: '#fff' }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                          <Mail size={10} />
                          {emp.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${ROLE_COLORS[emp.role] ?? ROLE_COLOR_FALLBACK}`}>
                        {roleLabelMap[emp.role] ?? emp.role}
                      </span>
                      {!emp.is_active && <span className="text-xs text-red-400 font-medium">Inactive</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INVITES ── */}
        {tab === 'invites' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowAddInvite(v => !v)}
                className={BTN_PRIMARY}
                style={{ background: '#fff', color: '#000' }}>
                <Link2 size={14} />Generate Invite Link
              </button>
            </div>

            {showAddInvite && (
              <form onSubmit={handleAddInvite}
                className="rounded-2xl p-5 mb-4 space-y-3 border border-white/[0.08]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <h3 className="text-sm font-semibold text-slate-300 mb-1">Generate invite link</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Name (optional)</label>
                    <input type="text" value={invName} onChange={e => setInvName(e.target.value)}
                      placeholder="Pre-fill name" className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Role</label>
                    <select value={invRole} onChange={e => setInvRole(e.target.value)} className={INPUT}>
                      {roleList.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Email (optional)</label>
                  <input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)}
                    placeholder="Pre-fill email" className={INPUT} />
                </div>
                {invError && <p className="text-xs text-red-400">{invError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={addingInv}
                    className={BTN_PRIMARY}
                    style={{ background: '#fff', color: '#000' }}>
                    {addingInv ? <Loader2 size={13} className="animate-spin" /> : null}
                    {addingInv ? 'Generating…' : 'Generate'}
                  </button>
                  <button type="button" onClick={() => setShowAddInvite(false)} className={BTN_GHOST}>Cancel</button>
                </div>
              </form>
            )}

            {invites.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/[0.05]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <Link2 size={20} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No invite links yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invites.map(inv => {
                  const isUsed = !!inv.used_at
                  const isExpired = !isUsed && new Date(inv.expires_at) < new Date()
                  return (
                    <div key={inv.id}
                      className={`rounded-xl px-4 py-3 border transition-all ${
                        isUsed ? 'opacity-50' : isExpired ? 'border-red-900/40' : 'border-white/[0.06]'
                      }`}
                      style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${ROLE_COLORS[inv.role] ?? ROLE_COLOR_FALLBACK}`}>
                              {roleLabelMap[inv.role] ?? inv.role}
                            </span>
                            {inv.name && <span className="text-slate-300 text-xs font-medium">{inv.name}</span>}
                            {inv.email && <span className="text-slate-500 text-xs">{inv.email}</span>}
                            {isUsed && <span className="text-green-400 text-xs font-semibold flex items-center gap-1"><Check size={10} />Used</span>}
                            {isExpired && <span className="text-red-400 text-xs font-semibold">Expired</span>}
                          </div>
                          <p className="text-slate-600 text-xs font-mono truncate">{inv.link}</p>
                        </div>
                        {!isUsed && !isExpired && (
                          <button onClick={() => copyLink(inv.token, inv.link)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.07] transition-all">
                            {copiedToken === inv.token ? <><Check size={11} className="text-green-400" />Copied</> : <><Copy size={11} />Copy</>}
                          </button>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs mt-1.5">
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

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-5">

            {/* Live status */}
            <div className={`rounded-2xl p-5 border transition-all ${
              isLive ? 'border-green-500/20' : 'border-white/[0.07]'
            }`}
              style={{ background: isLive ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-sm font-medium text-white">Live status</h2>
                    {isLive
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                          <Radio size={8} className="fill-green-400" />LIVE
                        </span>
                      : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">
                          OFFLINE
                        </span>
                    }
                  </div>
                  <p className="text-xs text-slate-600">
                    {isLive
                      ? 'Org is active — employees can log in and access the platform'
                      : 'Org is offline — login is disabled for all employees'}
                  </p>
                </div>
                <button type="button" onClick={() => setIsLive(v => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                    isLive ? 'bg-emerald-500' : 'bg-white/[0.08]'
                  }`}>
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                    isLive ? 'translate-x-5' : 'translate-x-0.5 bg-white'
                  }`} />
                </button>
              </div>
            </div>

            {/* Org details */}
            <div className="rounded-2xl p-5 space-y-4 border border-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h2 className="text-sm font-medium text-white">Organisation details</h2>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Name</label>
                <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">URL slug</label>
                <div className="flex items-center rounded-xl overflow-hidden border border-white/[0.1] bg-white/[0.05] focus-within:ring-1 focus-within:ring-white/20 focus-within:border-white/20 transition">
                  <span className="px-3 py-2.5 text-sm text-slate-600 border-r border-white/[0.08] shrink-0">consultrackk.vercel.app/</span>
                  <input type="text" required value={orgSlug}
                    onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2.5 bg-transparent text-sm text-white focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Brand palette */}
            <div className="rounded-2xl p-5 border border-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="mb-4">
                <h2 className="text-sm font-medium text-white">Brand palette</h2>
                <p className="text-xs text-neutral-600 mt-0.5">Customises the sidebar and accent colour for this org</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PALETTES.map(p => (
                  <button key={p.key} type="button" onClick={() => setBrandPalette(p.key)}
                    className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      brandPalette === p.key
                        ? 'border-white/30 bg-white/[0.08]'
                        : 'border-transparent hover:bg-white/[0.04]'
                    }`}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 relative"
                      style={{ backgroundColor: p.swatch }}>
                      {brandPalette === p.key && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check size={14} className="text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 text-center leading-tight">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature flags */}
            <div className="rounded-2xl p-5 space-y-1 border border-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="mb-4">
                <h2 className="text-sm font-medium text-white">Feature access</h2>
                <p className="text-xs text-neutral-600 mt-0.5">Control which modules this organisation can access</p>
              </div>
              {FEATURE_CONFIG.map(f => (
                <div key={f.key}
                  className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.05] last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: features[f.key] ? f.color : '#334155' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">{f.label}</p>
                      <p className="text-xs text-slate-600 mt-0.5 truncate">{f.description}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      features[f.key] ? 'bg-white' : 'bg-white/[0.08]'
                    }`}>
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                      features[f.key] ? 'translate-x-5 bg-black' : 'translate-x-0.5 bg-white'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Meta integration config */}
            <div className="rounded-2xl p-5 space-y-4 border border-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h2 className="text-sm font-medium text-white">Meta integration</h2>
                <p className="text-xs text-neutral-600 mt-0.5">Connects this org to a specific Facebook/Instagram page for auto-importing leads</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Facebook Page ID</label>
                <input
                  type="text"
                  value={metaPageId}
                  onChange={e => setMetaPageId(e.target.value.trim())}
                  placeholder="e.g. 123456789012345"
                  className={INPUT}
                />
                <p className="text-[11px] text-slate-600 mt-1.5">Found in your Facebook Page settings → About → Page ID</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Page Access Token <span className="text-slate-600 font-normal">(overrides global env)</span></label>
                <input
                  type="password"
                  value={metaAccessToken}
                  onChange={e => setMetaAccessToken(e.target.value.trim())}
                  placeholder="Leave blank to use global META_PAGE_ACCESS_TOKEN"
                  className={INPUT}
                />
                <p className="text-[11px] text-slate-600 mt-1.5">Generate a long-lived token in Meta Business Suite → System Users</p>
              </div>
            </div>

            <button type="submit" disabled={savingSettings}
              className={BTN_PRIMARY}
              style={{ background: '#fff', color: '#000' }}>
              {savingSettings ? <Loader2 size={14} className="animate-spin" /> : null}
              {savingSettings ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
