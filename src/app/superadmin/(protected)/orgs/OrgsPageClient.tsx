'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Users, Plus, ExternalLink, ChevronRight, Radio, FlaskConical, AlertTriangle } from 'lucide-react'
import { EnterOrgButton } from './EnterOrgButton'

const FEATURE_DOTS: { key: string; label: string; color: string }[] = [
  { key: 'lead_crm',   label: 'CRM',        color: '#14b8a6' },
  { key: 'pipeline',   label: 'Pipeline',   color: '#8b5cf6' },
  { key: 'sla',        label: 'SLA',        color: '#f59e0b' },
  { key: 'attendance', label: 'Attendance', color: '#3b82f6' },
  { key: 'roles',      label: 'Roles',      color: '#ec4899' },
  { key: 'meta',       label: 'Meta',       color: '#6366f1' },
]

type Org = {
  id: string; name: string; slug: string; logo_url: string | null
  features: Record<string, boolean> | null; is_live: boolean | null
  is_sandbox: boolean | null; created_at: string
  lead_limit?: number | null
  lead_limit_enforced?: boolean | null
}

interface RowProps {
  org: Org
  empCount: number
  leadCount: number
  isFirst: boolean
  accent: string
}

function OrgRow({ org, empCount, leadCount, isFirst, accent }: RowProps) {
  const features = (org.features ?? {}) as Record<string, boolean>
  const initial  = org.name?.charAt(0)?.toUpperCase() ?? '?'
  const timeAgo  = org.created_at ? formatDistanceToNow(new Date(org.created_at), { addSuffix: true }) : ''
  const isLive   = org.is_live !== false

  // Quota state derived per-row
  const limit       = (org.lead_limit ?? null) as number | null
  const pct         = limit && limit > 0 ? Math.round((leadCount / limit) * 100) : 0
  const overLimit   = limit !== null && leadCount >= limit
  const nearLimit   = limit !== null && pct >= 80 && !overLimit
  // Cream + pink textured base; over-limit overlays a subtle red wash
  const rowBg       = overLimit
    ? 'linear-gradient(135deg, #fff5f5 0%, #fde8e8 50%, #fbd5d5 100%)'
    : 'linear-gradient(135deg, #fff8f0 0%, #ffe9eb 60%, #fbd9e2 100%)'
  // Faint dot pattern overlay for the "textured" feel
  const texture     = `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)`
  const textureSize = '8px 8px'

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3.5 transition-all group ${!isFirst ? 'border-t border-white/[0.06]' : ''}`}
      style={{
        background: `${texture}, ${rowBg}`,
        backgroundSize: `${textureSize}, auto`,
        // Subtle outline for at-risk orgs, hard outline for over-limit ones
        boxShadow: overLimit
          ? 'inset 4px 0 0 0 #ef4444, 0 0 0 1px rgba(239,68,68,0.3)'
          : nearLimit
            ? 'inset 4px 0 0 0 #f59e0b'
            : 'none',
      }}
    >
      <Link href={`/superadmin/orgs/${org.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
        {org.logo_url ? (
          <img src={org.logo_url} alt={org.name}
            className="w-9 h-9 rounded-lg object-contain flex-shrink-0 bg-white/40 ring-1 ring-black/5" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{
              background: '#fff',
              color: '#000',
              boxShadow: `2px 2px 0 0 ${accent}`,
              transform: 'translate(-1px,-1px)',
            }}>
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-900 text-sm font-bold truncate tracking-tight">{org.name}</p>
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 tracking-widest"
                style={{ background: '#22c55e', color: '#000' }}>
                <Radio size={6} className="fill-black" />LIVE
              </span>
            ) : (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-black/10 text-slate-700 flex-shrink-0 tracking-widest">
                OFFLINE
              </span>
            )}
            {/* Quota chip: red if over, amber if near, neutral otherwise. Hidden when no limit. */}
            {limit !== null && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 tabular-nums"
                style={{
                  background: overLimit ? '#dc2626' : nearLimit ? '#f59e0b' : 'rgba(0,0,0,0.08)',
                  color:      overLimit || nearLimit ? '#fff' : '#475569',
                }}
                title={`${leadCount.toLocaleString('en-IN')} of ${limit.toLocaleString('en-IN')} leads used`}
              >
                {overLimit && <AlertTriangle size={8} />}
                {leadCount.toLocaleString('en-IN')}/{limit.toLocaleString('en-IN')} · {pct}%
              </span>
            )}
          </div>
          <p className="text-slate-600 text-xs truncate mt-0.5 font-mono">/{org.slug}</p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {FEATURE_DOTS.map(f => (
            <div key={f.key} title={f.label}
              className="w-1.5 h-1.5 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: features[f.key] !== false ? f.color : 'rgba(0,0,0,0.15)' }} />
          ))}
        </div>

        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 min-w-[60px]">
          <Users size={11} className="text-slate-500" />
          <span className="text-sm font-bold text-slate-700 tabular-nums">{empCount}</span>
        </div>

        <p className="hidden lg:block text-xs font-medium text-slate-600 flex-shrink-0 min-w-[90px] text-right">
          {timeAgo}
        </p>
      </Link>

      <EnterOrgButton orgId={org.id} orgName={org.name} />

      <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer"
        className="text-slate-500 hover:text-slate-900 transition-colors flex-shrink-0 p-1 opacity-0 group-hover:opacity-100">
        <ExternalLink size={12} />
      </a>

      <ChevronRight size={13} className="text-slate-400 group-hover:text-slate-700 transition-colors flex-shrink-0" />
    </div>
  )
}

interface Props {
  orgs: Org[]
  counts: Record<string, number>
  leadCounts: Record<string, number>
}

export function OrgsPageClient({ orgs, counts, leadCounts }: Props) {
  const sandboxOrgs = orgs.filter(o => o.is_sandbox)
  const regularOrgs = orgs.filter(o => !o.is_sandbox)
  const totalEmps   = Object.values(counts).reduce((a, b) => a + b, 0)
  const liveCount   = regularOrgs.filter(o => o.is_live !== false).length

  return (
    <div className="relative min-h-screen p-4 md:p-10">
      <div className="relative max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between mb-8 md:mb-10 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-2"
              style={{ color: 'rgba(99,102,241,0.8)' }}>
              Workspace management
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.45) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
              Organisations
            </h1>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/superadmin/orgs/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                boxShadow: '0 0 24px rgba(99,102,241,0.35)',
              }}
            >
              <Plus size={14} />
              New org
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total orgs',      value: regularOrgs.length, accent: '#6366f1' },
            { label: 'Total employees', value: totalEmps,           accent: '#14b8a6' },
            { label: 'Live',            value: liveCount,           accent: '#22c55e' },
          ].map(s => (
            <div key={s.label}
              className="rounded-xl px-4 py-3 border"
              style={{
                borderColor: `${s.accent}25`,
                background:  `linear-gradient(135deg, ${s.accent}09 0%, transparent 100%)`,
              }}>
              <p className="text-2xl font-black tabular-nums"
                style={{ color: s.accent }}>{s.value}</p>
              <p className="text-[11px] text-neutral-600 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Sandbox orgs (pinned at top, visually separate) ── */}
        {sandboxOrgs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={11} style={{ color: '#f59e0b' }} />
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#f59e0b' }}>
                Sandbox
              </p>
            </div>
            <div className="rounded-xl overflow-hidden border"
              style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.03)' }}>
              {sandboxOrgs.map((org, i) => (
                <OrgRow key={org.id} org={org} empCount={counts[org.id] ?? 0} leadCount={leadCounts[org.id] ?? 0} isFirst={i === 0} accent="#f59e0b" />
              ))}
            </div>
          </div>
        )}

        {/* ── Regular orgs ── */}
        {regularOrgs.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.01)' }}>
            <Building2 size={20} className="text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">No organisations yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.07] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            {regularOrgs.map((org, i) => (
              <OrgRow key={org.id} org={org} empCount={counts[org.id] ?? 0} leadCount={leadCounts[org.id] ?? 0} isFirst={i === 0} accent="#06b6d4" />
            ))}
          </div>
        )}

        {/* Feature legend */}
        {regularOrgs.length > 0 && (
          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <p className="text-[10px] text-neutral-700 font-bold uppercase tracking-widest">Features</p>
            {FEATURE_DOTS.map(f => (
              <div key={f.key} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                <span className="text-[10px] text-neutral-600">{f.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
