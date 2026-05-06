'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Copy, Check, ExternalLink,
  Users, Mail, Link2, Loader2, Radio, Pipette,
  Upload, Trash2, ImageIcon, Send, Eye, EyeOff, Zap, Instagram,
} from 'lucide-react'
import { PALETTES, DEFAULT_PALETTE } from '@/lib/orgTheme'
import { DeleteOrgModal } from '@/components/DeleteOrgModal'

type Employee = { id: string; name: string; email: string; role: string; is_active: boolean; created_at: string }
type Invite = { id: string; token: string; email: string | null; name: string | null; role: string; used_at: string | null; expires_at: string; created_at: string; link: string }
type Features = {
  lead_crm: boolean; sla: boolean; pipeline: boolean
  roles: boolean; attendance: boolean; meta: boolean; instagram: boolean; bulk_upload: boolean
}
type MetaConfig      = { page_id?: string; access_token?: string }
type InstagramConfig = { ig_account_id?: string; access_token?: string; capi_dataset_id?: string }
type OrgRole = { key: string; label: string }
type Org = { id: string; name: string; slug: string; logo_url: string | null; features?: Features; brand_palette?: string; meta_config?: MetaConfig; meta_setup_sent_at?: string | null; instagram_config?: InstagramConfig; instagram_setup_sent_at?: string | null; is_live?: boolean; is_sandbox?: boolean; lead_limit?: number | null; lead_limit_enforced?: boolean; created_at: string }

const ROLE_COLORS: Record<string, string> = {
  ad: 'bg-teal-500/15 text-[var(--sa-accent-3)] border-teal-500/30',
  tl: 'bg-blue-500/15 text-[var(--sa-accent-3)] border-blue-500/30',
  counsellor: 'bg-slate-500/15 text-[var(--sa-text)] border-slate-500/20',
  telesales: 'bg-purple-500/15 text-[var(--sa-accent-4)] border-purple-500/30',
}
const ROLE_COLOR_FALLBACK = 'bg-slate-500/15 text-[var(--sa-text)] border-slate-500/20'

const DEFAULT_FEATURES: Features = { lead_crm: true, sla: true, pipeline: true, roles: true, attendance: true, meta: true, instagram: true, bulk_upload: true }

const FEATURE_CONFIG: { key: keyof Features; label: string; description: string; color: string }[] = [
  { key: 'lead_crm',    label: 'Lead CRM',            description: 'Dashboard, lead pipeline, bulk CSV upload, offline approvals', color: '#14b8a6' },
  { key: 'pipeline',    label: 'Pipeline Config',      description: 'Custom stages, sub-stages, and transition flow editor',       color: '#8b5cf6' },
  { key: 'sla',         label: 'Deadline Breach',      description: 'Stage-level deadline tracking with breach alerts and logs',   color: '#f59e0b' },
  { key: 'attendance',  label: 'Attendance & Leaves',  description: 'Clock-in/out with wifi verification, leave approvals',       color: '#3b82f6' },
  { key: 'roles',       label: 'Role Management',      description: 'Custom roles with granular access permissions',               color: '#ec4899' },
  { key: 'meta',        label: 'Facebook Lead Ads',    description: 'Auto-import leads from Facebook Lead Ads campaigns',          color: '#6366f1' },
  { key: 'instagram',   label: 'Instagram Lead Ads',   description: 'Auto-import leads from Instagram Lead Ads (separate from FB)', color: '#e1306c' },
  { key: 'bulk_upload', label: 'Bulk CSV Upload',      description: 'Import leads in bulk via CSV — map columns and push to pipeline', color: '#10b981' },
]

interface Props {
  org: Org
  employees: Employee[]
  invites: Invite[]
  orgRoles: OrgRole[]
}

const INPUT = 'w-full px-3 py-2.5 bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-lg text-sm text-[var(--sa-text)] placeholder-[var(--sa-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--sa-accent)]/40 focus:border-[var(--sa-border-strong)] transition'
const BTN_PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--sa-accent)] text-[var(--sa-text-on-accent)] hover:opacity-90 transition-all disabled:opacity-40'
const BTN_GHOST = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--sa-text-secondary)] hover:text-[var(--sa-text)] bg-[var(--sa-surface)] hover:bg-[var(--sa-surface-hover)] border border-[var(--sa-divider)] transition-all'

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
  // Plan & Limits — lead ceiling. null = unlimited; '' string in input = null on save.
  const [leadLimit, setLeadLimit] = useState<string>(
    org.lead_limit !== null && org.lead_limit !== undefined ? String(org.lead_limit) : ''
  )
  const [leadLimitEnforced, setLeadLimitEnforced] = useState<boolean>(org.lead_limit_enforced ?? true)
  const [brandPalette, setBrandPalette] = useState(org.brand_palette ?? DEFAULT_PALETTE)
  const [metaPageId, setMetaPageId] = useState(org.meta_config?.page_id ?? '')
  const [metaAccessToken, setMetaAccessToken] = useState(org.meta_config?.access_token ?? '')
  const [savingSettings, setSavingSettings] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [resettingSandbox, setResettingSandbox] = useState(false)
  const [resetCodeMap, setResetCodeMap] = useState<Record<string, string>>({}) // employeeId → code
  const [generatingCode, setGeneratingCode] = useState<string | null>(null) // employeeId
  const colorInputRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState<string | null>(org.logo_url)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Meta (Facebook) integration
  const [sendingGuide, setSendingGuide] = useState(false)
  const [guideSent, setGuideSent] = useState(!!org.meta_setup_sent_at)
  const [showAccessToken, setShowAccessToken] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Instagram integration
  const [igAccountId, setIgAccountId] = useState(org.instagram_config?.ig_account_id ?? '')
  const [igAccessToken, setIgAccessToken] = useState(org.instagram_config?.access_token ?? '')
  const [igCapiDatasetId, setIgCapiDatasetId] = useState(org.instagram_config?.capi_dataset_id ?? '')
  const [sendingIgGuide, setSendingIgGuide] = useState(false)
  const [igGuideSent, setIgGuideSent] = useState(!!org.instagram_setup_sent_at)
  const [showIgAccessToken, setShowIgAccessToken] = useState(false)
  const igConnected = !!(igAccountId && igAccountId.trim())

  const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultrackk.vercel.app'}/api/meta/webhook`

  function copyMeta(value: string, field: string) {
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function sendSetupGuide() {
    setSendingGuide(true)
    const res = await fetch(`/api/superadmin/orgs/${org.id}/send-guide`, { method: 'POST' })
    if (res.ok) { setGuideSent(true); toast.success('Setup guide sent to client') }
    else toast.error('Failed to send guide')
    setSendingGuide(false)
  }

  async function sendIgSetupGuide() {
    setSendingIgGuide(true)
    const res = await fetch(`/api/superadmin/orgs/${org.id}/send-ig-guide`, { method: 'POST' })
    if (res.ok) { setIgGuideSent(true); toast.success('Instagram setup guide sent to client') }
    else toast.error('Failed to send guide')
    setSendingIgGuide(false)
  }

  const metaConnected = !!(metaPageId && metaPageId.trim())

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/superadmin/orgs/${org.id}/logo`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) toast.error(data.error || 'Upload failed')
    else { setLogoUrl(data.logo_url); toast.success('Logo updated') }
    setUploadingLogo(false)
  }

  async function handleLogoRemove() {
    if (!confirm('Remove this org\'s logo?')) return
    setRemovingLogo(true)
    const res = await fetch(`/api/superadmin/orgs/${org.id}/logo`, { method: 'DELETE' })
    if (res.ok) { setLogoUrl(null); toast.success('Logo removed') }
    else toast.error('Failed to remove logo')
    setRemovingLogo(false)
  }

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
        instagram_config: {
          ig_account_id:  igAccountId     || undefined,
          access_token:   igAccessToken   || undefined,
          capi_dataset_id: igCapiDatasetId || undefined,
        },
        // Plan & Limits — empty string means unlimited (null in DB)
        lead_limit: leadLimit.trim() === '' ? null : Math.max(0, Number(leadLimit) || 0),
        lead_limit_enforced: leadLimitEnforced,
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

  async function handleDeleteOrg() {
    const res = await fetch(`/api/superadmin/orgs/${org.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Organisation deleted')
      window.location.href = '/superadmin/orgs'
    } else {
      const d = await res.json()
      toast.error(d.error || 'Failed to delete org')
      throw new Error(d.error || 'Failed')
    }
  }

  async function handleResetSandbox() {
    if (!window.confirm('Reset sandbox to defaults? All leads and pipeline changes will be wiped. Employees are kept.')) return
    setResettingSandbox(true)
    const res = await fetch(`/api/superadmin/orgs/${org.id}/reset`, { method: 'POST' })
    if (res.ok) toast.success('Sandbox reset to defaults')
    else { const d = await res.json(); toast.error(d.error || 'Failed to reset') }
    setResettingSandbox(false)
  }

  async function handleGenerateResetCode(employeeId: string) {
    setGeneratingCode(employeeId)
    const res = await fetch('/api/superadmin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Failed to generate code') }
    else {
      setResetCodeMap(prev => ({ ...prev, [employeeId]: data.code }))
      toast.success(`Code generated for ${data.email}`)
    }
    setGeneratingCode(null)
  }

  function copyLink(token: string, link: string) {
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const enabledCount = Object.values(features).filter(Boolean).length

  return (
    <div className="min-h-screen p-4 md:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link href="/superadmin/orgs"
          className="inline-flex items-center gap-1.5 text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] text-sm mb-6 transition-colors">
          <ArrowLeft size={13} />
          All organisations
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={orgName}
                className="w-11 h-11 rounded-xl object-contain flex-shrink-0 bg-[var(--sa-surface-hover)]" />
            ) : (
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-base flex-shrink-0 bg-[var(--sa-surface-hover)] text-[var(--sa-text)]">
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-[var(--sa-text)] tracking-tight">{orgName}</h1>
                {isLive
                  ? <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-[var(--sa-success)] border border-emerald-500/20">
                      <Radio size={7} className="fill-emerald-400" />LIVE
                    </span>
                  : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--sa-surface-hover)] text-[var(--sa-text-muted)] border border-[var(--sa-divider)]">
                      OFFLINE
                    </span>
                }
              </div>
              <p className="text-[var(--sa-text-muted)] text-sm mt-0.5 flex items-center gap-1.5">
                <span>/{orgSlug}</span>
                <span className="text-[var(--sa-text-muted)]">·</span>
                <span>{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
                <span className="text-[var(--sa-text-muted)]">·</span>
                <span>{enabledCount}/{FEATURE_CONFIG.length} features</span>
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
        <div className="flex gap-1 p-1 rounded-lg mb-6 w-fit border border-[var(--sa-divider)] bg-[var(--sa-surface)]">
          {(['employees', 'invites', 'settings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? 'text-[var(--sa-text)] bg-[var(--sa-surface-strong)] border border-[var(--sa-border-strong)]'
                  : 'text-[var(--sa-text-muted)] hover:text-[var(--sa-text)]'
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
                style={{ background: "var(--sa-accent)", color: "var(--sa-text-on-accent)" }}>
                <Plus size={14} />Add Employee
              </button>
            </div>

            {showAddEmployee && (
              <form onSubmit={handleAddEmployee}
                className="rounded-2xl p-5 mb-4 space-y-3 border border-[var(--sa-border)]"
                style={{ background: "var(--sa-surface)" }}>
                <h3 className="text-sm font-semibold text-[var(--sa-text)] mb-1">New employee</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Full name</label>
                    <input type="text" required value={empName} onChange={e => setEmpName(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Role</label>
                    <select value={empRole} onChange={e => setEmpRole(e.target.value)} className={INPUT}>
                      {roleList.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Email</label>
                  <input type="email" required value={empEmail} onChange={e => setEmpEmail(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Password</label>
                  <input type="text" required value={empPassword} onChange={e => setEmpPassword(e.target.value)} className={INPUT} />
                </div>
                {empError && <p className="text-xs text-red-400">{empError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={addingEmp}
                    className={BTN_PRIMARY}
                    style={{ background: "var(--sa-accent)", color: "var(--sa-text-on-accent)" }}>
                    {addingEmp ? <Loader2 size={13} className="animate-spin" /> : null}
                    {addingEmp ? 'Adding…' : 'Add employee'}
                  </button>
                  <button type="button" onClick={() => setShowAddEmployee(false)} className={BTN_GHOST}>Cancel</button>
                </div>
              </form>
            )}

            {employees.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-[var(--sa-divider)]"
                style={{ background: "var(--sa-surface)" }}>
                <Users size={20} className="text-[var(--sa-text-secondary)] mx-auto mb-2" />
                <p className="text-[var(--sa-text-secondary)] text-sm">No employees yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map(emp => (
                  <div key={emp.id}
                    className="group flex items-center justify-between rounded-xl px-4 py-3 border border-[var(--sa-divider)]"
                    style={{ background: "var(--sa-surface)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--sa-accent)', color: 'var(--sa-text-on-accent)' }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--sa-text)] text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-[var(--sa-text-secondary)] text-xs flex items-center gap-1 mt-0.5">
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
                      {/* Password reset — shows generated code inline */}
                      {resetCodeMap[emp.id] ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--sa-accent-2)] bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg tracking-widest">
                            {resetCodeMap[emp.id]}
                          </span>
                          <button onClick={() => { navigator.clipboard.writeText(resetCodeMap[emp.id]); toast.success('Code copied') }}
                            className="text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] p-1 transition-colors" title="Copy code">
                            <Copy size={11} />
                          </button>
                          <button onClick={() => setResetCodeMap(prev => { const n = {...prev}; delete n[emp.id]; return n })}
                            className="text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] p-1 transition-colors" title="Dismiss">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateResetCode(emp.id)}
                          disabled={generatingCode === emp.id}
                          title="Generate password reset code for this employee"
                          className="opacity-0 group-hover:opacity-100 text-[var(--sa-text-muted)] hover:text-[var(--sa-accent-2)] transition-all p-1 flex-shrink-0"
                        >
                          {generatingCode === emp.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Zap size={11} />
                          }
                        </button>
                      )}
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
                style={{ background: "var(--sa-accent)", color: "var(--sa-text-on-accent)" }}>
                <Link2 size={14} />Generate Invite Link
              </button>
            </div>

            {showAddInvite && (
              <form onSubmit={handleAddInvite}
                className="rounded-2xl p-5 mb-4 space-y-3 border border-[var(--sa-border)]"
                style={{ background: "var(--sa-surface)" }}>
                <h3 className="text-sm font-semibold text-[var(--sa-text)] mb-1">Generate invite link</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Name (optional)</label>
                    <input type="text" value={invName} onChange={e => setInvName(e.target.value)}
                      placeholder="Pre-fill name" className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Role</label>
                    <select value={invRole} onChange={e => setInvRole(e.target.value)} className={INPUT}>
                      {roleList.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Email (optional)</label>
                  <input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)}
                    placeholder="Pre-fill email" className={INPUT} />
                </div>
                {invError && <p className="text-xs text-red-400">{invError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={addingInv}
                    className={BTN_PRIMARY}
                    style={{ background: "var(--sa-accent)", color: "var(--sa-text-on-accent)" }}>
                    {addingInv ? <Loader2 size={13} className="animate-spin" /> : null}
                    {addingInv ? 'Generating…' : 'Generate'}
                  </button>
                  <button type="button" onClick={() => setShowAddInvite(false)} className={BTN_GHOST}>Cancel</button>
                </div>
              </form>
            )}

            {invites.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-[var(--sa-divider)]"
                style={{ background: "var(--sa-surface)" }}>
                <Link2 size={20} className="text-[var(--sa-text-secondary)] mx-auto mb-2" />
                <p className="text-[var(--sa-text-secondary)] text-sm">No invite links yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invites.map(inv => {
                  const isUsed = !!inv.used_at
                  const isExpired = !isUsed && new Date(inv.expires_at) < new Date()
                  return (
                    <div key={inv.id}
                      className={`rounded-xl px-4 py-3 border transition-all ${
                        isUsed ? 'opacity-50' : isExpired ? 'border-red-900/40' : 'border-[var(--sa-divider)]'
                      }`}
                      style={{ background: "var(--sa-surface)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${ROLE_COLORS[inv.role] ?? ROLE_COLOR_FALLBACK}`}>
                              {roleLabelMap[inv.role] ?? inv.role}
                            </span>
                            {inv.name && <span className="text-[var(--sa-text)] text-xs font-medium">{inv.name}</span>}
                            {inv.email && <span className="text-[var(--sa-text-secondary)] text-xs">{inv.email}</span>}
                            {isUsed && <span className="text-green-400 text-xs font-semibold flex items-center gap-1"><Check size={10} />Used</span>}
                            {isExpired && <span className="text-red-400 text-xs font-semibold">Expired</span>}
                          </div>
                          <p className="text-[var(--sa-text-secondary)] text-xs font-mono truncate">{inv.link}</p>
                        </div>
                        {!isUsed && !isExpired && (
                          <button onClick={() => copyLink(inv.token, inv.link)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--sa-text-secondary)] hover:text-[var(--sa-text)] border border-[var(--sa-divider)] hover:bg-[var(--sa-surface-hover)] transition-all">
                            {copiedToken === inv.token ? <><Check size={11} className="text-green-400" />Copied</> : <><Copy size={11} />Copy</>}
                          </button>
                        )}
                      </div>
                      <p className="text-[var(--sa-text-secondary)] text-xs mt-1.5">
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
          <>
          <form onSubmit={handleSaveSettings} className="space-y-5">

            {/* Live status */}
            <div className={`rounded-2xl p-5 border transition-all ${
              isLive ? 'border-green-500/20' : 'border-[var(--sa-border)]'
            }`}
              style={{ background: isLive ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-sm font-medium text-[var(--sa-text)]">Live status</h2>
                    {isLive
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                          <Radio size={8} className="fill-green-400" />LIVE
                        </span>
                      : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-[var(--sa-text-secondary)] border border-slate-500/20">
                          OFFLINE
                        </span>
                    }
                  </div>
                  <p className="text-xs text-[var(--sa-text-secondary)]">
                    {isLive
                      ? 'Org is active — employees can log in and access the platform'
                      : 'Org is offline — login is disabled for all employees'}
                  </p>
                </div>
                <button type="button" onClick={() => setIsLive(v => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                    isLive ? 'bg-emerald-500' : 'bg-[var(--sa-surface-hover)]'
                  }`}>
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                    isLive ? 'translate-x-5' : 'translate-x-0.5 bg-white'
                  }`} />
                </button>
              </div>
            </div>

            {/* Logo */}
            <div className="rounded-2xl p-5 border border-[var(--sa-divider)]"
              style={{ background: "var(--sa-surface)" }}>
              <h2 className="text-sm font-medium text-[var(--sa-text)] mb-4">Logo</h2>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--sa-border)]"
                  style={{ background: "var(--sa-surface)" }}>
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <ImageIcon size={22} className="text-[var(--sa-text-muted)]" />
                  }
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className={BTN_GHOST}
                  >
                    {uploadingLogo
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Upload size={13} />
                    }
                    {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={removingLogo}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:text-red-400 bg-red-500/[0.06] hover:bg-red-500/[0.1] border border-red-500/20 transition-all disabled:opacity-40"
                    >
                      {removingLogo ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Remove
                    </button>
                  )}
                  <p className="text-[11px] text-[var(--sa-text-muted)]">PNG, JPG, WebP or SVG · max 2 MB</p>
                </div>
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoUpload(file)
                  e.target.value = ''
                }}
              />
            </div>

            {/* ── Meta Integration ── */}
            <div className="rounded-2xl p-5 space-y-4 border border-[var(--sa-divider)]"
              style={{ background: "var(--sa-surface)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: metaConnected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)' }}>
                    <Zap size={13} className={metaConnected ? 'text-indigo-400' : 'text-[var(--sa-text-muted)]'} />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-[var(--sa-text)]">Meta Integration</h2>
                    <p className="text-[10px] text-[var(--sa-text-muted)] mt-0.5">
                      {metaConnected ? 'Connected — receiving leads from Meta Ads' : 'Not configured'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  metaConnected
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-[var(--sa-surface)] text-[var(--sa-text-muted)] border-[var(--sa-divider)]'
                }`}>
                  {metaConnected ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-[11px] text-[var(--sa-text-secondary)] mb-1.5">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-white/[0.03] border border-[var(--sa-divider)] rounded-lg text-xs text-[var(--sa-text-secondary)] font-mono truncate">
                    {WEBHOOK_URL}
                  </div>
                  <button type="button" onClick={() => copyMeta(WEBHOOK_URL, 'webhook')}
                    className={BTN_GHOST + ' !px-2.5'}>
                    {copiedField === 'webhook' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Page ID */}
              <div>
                <label className="block text-[11px] text-[var(--sa-text-secondary)] mb-1.5">Facebook Page ID</label>
                <input
                  type="text"
                  value={metaPageId}
                  onChange={e => setMetaPageId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className={INPUT}
                />
                <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">Leads are routed to this org when Meta sends events from this Page ID</p>
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-[11px] text-[var(--sa-text-secondary)] mb-1.5">Page Access Token</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showAccessToken ? 'text' : 'password'}
                    value={metaAccessToken}
                    onChange={e => setMetaAccessToken(e.target.value)}
                    placeholder="EAAx…"
                    className={INPUT + ' font-mono flex-1'}
                  />
                  <button type="button" onClick={() => setShowAccessToken(v => !v)}
                    className={BTN_GHOST + ' !px-2.5'}>
                    {showAccessToken ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">Used to fetch lead field data from Meta Graph API</p>
              </div>

              {/* Send setup guide */}
              <div className="pt-1 border-t border-[var(--sa-divider)] flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--sa-text-secondary)]">Send setup guide to client admin</p>
                  <p className="text-[10px] text-[var(--sa-text-muted)] mt-0.5">
                    {guideSent
                      ? 'Guide sent — visible on the client\'s Meta settings page'
                      : 'Client will see step-by-step instructions on their Meta Leads page'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sendingGuide}
                  onClick={sendSetupGuide}
                  className={BTN_GHOST + ' flex-shrink-0'}
                >
                  {sendingGuide
                    ? <Loader2 size={13} className="animate-spin" />
                    : guideSent
                      ? <Check size={13} className="text-green-400" />
                      : <Send size={13} />
                  }
                  {guideSent ? 'Sent' : 'Send Guide'}
                </button>
              </div>
            </div>

            {/* ── Instagram Integration ── */}
            <div className="rounded-2xl p-5 space-y-4 border border-[var(--sa-divider)]"
              style={{ background: "var(--sa-surface)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: igConnected ? 'rgba(225,48,108,0.2)' : 'rgba(255,255,255,0.05)' }}>
                    <Instagram size={13} className={igConnected ? 'text-pink-400' : 'text-[var(--sa-text-muted)]'} />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-[var(--sa-text)]">Instagram Integration</h2>
                    <p className="text-[10px] text-[var(--sa-text-muted)] mt-0.5">
                      {igConnected ? 'Connected — receiving leads from Instagram Lead Ads' : 'Not configured'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  igConnected
                    ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                    : 'bg-[var(--sa-surface)] text-[var(--sa-text-muted)] border-[var(--sa-divider)]'
                }`}>
                  {igConnected ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>

              {/* Shared Webhook URL */}
              <div>
                <label className="block text-[11px] text-[var(--sa-text-secondary)] mb-1.5">Webhook URL (same as Facebook)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-white/[0.03] border border-[var(--sa-divider)] rounded-lg text-xs text-[var(--sa-text-secondary)] font-mono truncate">
                    {WEBHOOK_URL}
                  </div>
                  <button type="button" onClick={() => copyMeta(WEBHOOK_URL, 'ig-webhook')}
                    className={BTN_GHOST + ' !px-2.5'}>
                    {copiedField === 'ig-webhook' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* IG Business Account ID */}
              <div>
                <label className="block text-[11px] text-[var(--sa-text-secondary)] mb-1.5">Instagram Business Account ID</label>
                <input
                  type="text"
                  value={igAccountId}
                  onChange={e => setIgAccountId(e.target.value)}
                  placeholder="e.g. 17841400000000000"
                  className={INPUT}
                />
                <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">Leads are routed to this org when Meta sends events from this IG Business Account ID</p>
              </div>

              {/* IG Access Token */}
              <div>
                <label className="block text-[11px] text-[var(--sa-text-secondary)] mb-1.5">Instagram Page Access Token</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showIgAccessToken ? 'text' : 'password'}
                    value={igAccessToken}
                    onChange={e => setIgAccessToken(e.target.value)}
                    placeholder="EAAx…"
                    className={INPUT + ' font-mono flex-1'}
                  />
                  <button type="button" onClick={() => setShowIgAccessToken(v => !v)}
                    className={BTN_GHOST + ' !px-2.5'}>
                    {showIgAccessToken ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">Used to fetch lead field data from Meta Graph API for Instagram leads</p>
              </div>

              {/* IG CAPI Dataset ID (optional) */}
              <div>
                <label className="block text-[11px] text-[var(--sa-text-secondary)] mb-1.5">CAPI Dataset ID <span className="text-[var(--sa-text-muted)]">(optional)</span></label>
                <input
                  type="text"
                  value={igCapiDatasetId}
                  onChange={e => setIgCapiDatasetId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className={INPUT}
                />
                <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">Required only for push-audience (conversion signal) functionality on Instagram</p>
              </div>

              {/* Send IG setup guide */}
              <div className="pt-1 border-t border-[var(--sa-divider)] flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--sa-text-secondary)]">Send Instagram setup guide to client admin</p>
                  <p className="text-[10px] text-[var(--sa-text-muted)] mt-0.5">
                    {igGuideSent
                      ? 'Guide sent — visible on the client\'s Instagram settings page'
                      : 'Client will see step-by-step instructions on their Instagram Leads page'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sendingIgGuide}
                  onClick={sendIgSetupGuide}
                  className={BTN_GHOST + ' flex-shrink-0'}
                >
                  {sendingIgGuide
                    ? <Loader2 size={13} className="animate-spin" />
                    : igGuideSent
                      ? <Check size={13} className="text-green-400" />
                      : <Send size={13} />
                  }
                  {igGuideSent ? 'Sent' : 'Send Guide'}
                </button>
              </div>
            </div>

            {/* Org details */}
            <div className="rounded-2xl p-5 space-y-4 border border-[var(--sa-divider)]"
              style={{ background: "var(--sa-surface)" }}>
              <h2 className="text-sm font-medium text-[var(--sa-text)]">Organisation details</h2>
              <div>
                <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Name</label>
                <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">URL slug</label>
                <div className="flex items-center rounded-xl overflow-hidden border border-[var(--sa-border-strong)] bg-[var(--sa-surface-hover)] focus-within:ring-1 focus-within:ring-white/20 focus-within:border-[var(--sa-border-strong)] transition">
                  <span className="px-3 py-2.5 text-sm text-[var(--sa-text-secondary)] border-r border-[var(--sa-border)] shrink-0">{(process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultrackk.vercel.app').replace('https://', '')}/</span>
                  <input type="text" required value={orgSlug}
                    onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2.5 bg-transparent text-sm text-[var(--sa-text)] focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Brand palette */}
            <div className="rounded-2xl p-5 border border-[var(--sa-divider)]"
              style={{ background: "var(--sa-surface)" }}>
              <div className="mb-4">
                <h2 className="text-sm font-medium text-[var(--sa-text)]">Brand colour</h2>
                <p className="text-xs text-[var(--sa-text-muted)] mt-0.5">Sets the sidebar and accent colour for this org</p>
              </div>

              {/* Preset swatches */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {PALETTES.map(p => {
                  const active = brandPalette === p.key
                  return (
                    <button key={p.key} type="button" onClick={() => setBrandPalette(p.key)}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all ${
                        active ? 'border-[var(--sa-border-strong)] bg-[var(--sa-surface-hover)]' : 'border-transparent hover:bg-[var(--sa-surface)]'
                      }`}>
                      <div className="w-8 h-8 rounded-full flex-shrink-0 relative"
                        style={{ backgroundColor: p.swatch }}>
                        {active && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check size={14} className="text-[var(--sa-text)] drop-shadow" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--sa-text-secondary)] text-center leading-tight">{p.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[var(--sa-surface-hover)]" />
                <span className="text-[10px] text-[var(--sa-text-muted)] font-medium uppercase tracking-wide">or custom</span>
                <div className="flex-1 h-px bg-[var(--sa-surface-hover)]" />
              </div>

              {/* Custom colour picker */}
              <div className="flex items-center gap-3">
                {/* Swatch preview + opens native colour wheel */}
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    title="Pick a custom colour"
                    className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden ${
                      brandPalette.startsWith('#')
                        ? 'border-white/40 ring-1 ring-white/20'
                        : 'border-[var(--sa-border)] hover:border-[var(--sa-border-strong)]'
                    }`}
                    style={{
                      background: brandPalette.startsWith('#')
                        ? brandPalette
                        : 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
                    }}
                  >
                    {!brandPalette.startsWith('#') && (
                      <Pipette size={14} className="text-[var(--sa-text)] drop-shadow-sm" />
                    )}
                    {brandPalette.startsWith('#') && (
                      <Check size={14} className="text-[var(--sa-text)] drop-shadow" />
                    )}
                  </button>
                  {/* Hidden native colour input — triggers OS colour wheel */}
                  <input
                    ref={colorInputRef}
                    type="color"
                    className="sr-only"
                    value={brandPalette.startsWith('#') ? brandPalette : '#3d9191'}
                    onChange={e => setBrandPalette(e.target.value)}
                  />
                </div>

                <div className="flex-1">
                  {brandPalette.startsWith('#') ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={brandPalette}
                        onChange={e => {
                          const v = e.target.value.trim()
                          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBrandPalette(v)
                        }}
                        maxLength={7}
                        className="w-28 px-3 py-1.5 bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-lg text-sm text-[var(--sa-text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--sa-accent)]/30 uppercase"
                        placeholder="#000000"
                      />
                      <button
                        type="button"
                        onClick={() => setBrandPalette(DEFAULT_PALETTE)}
                        className="text-xs text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] transition-colors"
                      >
                        Reset to preset
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-[var(--sa-text-secondary)]">Custom colour</p>
                      <p className="text-xs text-[var(--sa-text-muted)] mt-0.5">Click the wheel to open the colour picker</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Live preview bar */}
              {brandPalette.startsWith('#') && brandPalette.length === 7 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full"
                    style={{ background: `linear-gradient(to right, ${brandPalette}22, ${brandPalette}88, ${brandPalette})` }} />
                  <span className="text-[10px] text-[var(--sa-text-muted)]">preview</span>
                </div>
              )}
            </div>

            {/* Feature flags */}
            <div className="rounded-2xl p-5 space-y-1 border border-[var(--sa-divider)]"
              style={{ background: "var(--sa-surface)" }}>
              <div className="mb-4">
                <h2 className="text-sm font-medium text-[var(--sa-text)]">Feature access</h2>
                <p className="text-xs text-[var(--sa-text-muted)] mt-0.5">Control which modules this organisation can access</p>
              </div>
              {FEATURE_CONFIG.map(f => (
                <div key={f.key}
                  className="flex items-center justify-between gap-4 py-3 border-b border-[var(--sa-divider)] last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: features[f.key] ? f.color : '#334155' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">{f.label}</p>
                      <p className="text-xs text-[var(--sa-text-secondary)] mt-0.5 truncate">{f.description}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      features[f.key] ? 'bg-[var(--sa-accent)]' : 'bg-[var(--sa-surface-hover)]'
                    }`}>
                    <span className={`inline-block h-5 w-5 rounded-full shadow transition-transform mt-0.5 bg-white ${
                      features[f.key] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Plan & Limits — lead ceiling + enforcement toggle */}
            <div className="rounded-2xl p-5 space-y-4 border border-[var(--sa-divider)]"
              style={{ background: "var(--sa-surface)" }}>
              <div>
                <h2 className="text-sm font-medium text-[var(--sa-text)]">Plan & Limits</h2>
                <p className="text-xs text-[var(--sa-text-muted)] mt-0.5">
                  Lead ceiling for this org. Alerts fire at 80% and 100%; new lead creation is blocked at 100% when enforcement is on.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Lead limit</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={leadLimit}
                    onChange={e => setLeadLimit(e.target.value)}
                    placeholder="Leave blank for unlimited"
                    className={INPUT}
                  />
                  <p className="text-[10px] text-[var(--sa-text-muted)] mt-1">Blank = unlimited (no alerts, no block)</p>
                </div>

                <div>
                  <label className="block text-xs text-[var(--sa-text-secondary)] mb-1.5">Hard enforcement</label>
                  <div className="flex items-center gap-3 h-10 px-3 rounded-lg border border-[var(--sa-border)] bg-[var(--sa-surface)]">
                    <button type="button" onClick={() => setLeadLimitEnforced(v => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                        leadLimitEnforced ? 'bg-emerald-500/40' : 'bg-[var(--sa-surface-hover)]'
                      }`}>
                      <span className={`inline-block h-5 w-5 rounded-full shadow transition-transform mt-0.5 ${
                        leadLimitEnforced ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-white'
                      }`} />
                    </button>
                    <span className="text-xs text-[var(--sa-text)]">
                      {leadLimitEnforced
                        ? 'Block new leads at 100%'
                        : 'Alerts only (creation always allowed)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={savingSettings}
              className={BTN_PRIMARY}
              style={{ background: "var(--sa-accent)", color: "var(--sa-text-on-accent)" }}>
              {savingSettings ? <Loader2 size={14} className="animate-spin" /> : null}
              {savingSettings ? 'Saving…' : 'Save Changes'}
            </button>
          </form>

          {/* Danger zone */}
          <div className="mt-8 rounded-2xl p-5 border border-red-900/30"
            style={{ background: 'rgba(239,68,68,0.04)' }}>
            <h2 className="text-sm font-semibold text-red-400 mb-1">Danger zone</h2>
            <p className="text-xs text-[var(--sa-text-muted)] mb-4">These actions are destructive and irreversible.</p>
            <div className="flex flex-wrap gap-3">
              {org.is_sandbox && (
                <button
                  type="button"
                  onClick={handleResetSandbox}
                  disabled={resettingSandbox}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-amber-500/30 text-[var(--sa-accent-2)] hover:bg-amber-500/10 transition-all disabled:opacity-40"
                >
                  {resettingSandbox ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  {resettingSandbox ? 'Resetting…' : 'Reset Sandbox to Defaults'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={13} />
                Delete Organisation
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {showDeleteModal && (
        <DeleteOrgModal
          orgName={org.name}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteOrg}
        />
      )}
    </div>
  )
}
