'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Users, Plus, ExternalLink, ChevronRight, Radio, FlaskConical, Sparkles } from 'lucide-react'
import { EnterOrgButton } from './EnterOrgButton'
import { FloatingMessages } from '../FloatingMessages'

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
}

function OrgRow({ org, empCount, isFirst }: { org: Org; empCount: number; isFirst: boolean }) {
  const features = (org.features ?? {}) as Record<string, boolean>
  const initial  = org.name?.charAt(0)?.toUpperCase() ?? '?'
  const timeAgo  = org.created_at ? formatDistanceToNow(new Date(org.created_at), { addSuffix: true }) : ''
  const isLive   = org.is_live !== false

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors group ${
      !isFirst ? 'border-t border-white/[0.06]' : ''
    }`}>
      <Link href={`/superadmin/orgs/${org.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
        {org.logo_url ? (
          <img src={org.logo_url} alt={org.name}
            className="w-9 h-9 rounded-lg object-contain flex-shrink-0 bg-white/[0.04]" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 bg-white/[0.06] text-white">
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-medium truncate">{org.name}</p>
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                <Radio size={6} className="fill-emerald-400" />LIVE
              </span>
            ) : (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-600 border border-white/[0.06] flex-shrink-0">
                OFFLINE
              </span>
            )}
          </div>
          <p className="text-neutral-600 text-xs truncate mt-0.5">/{org.slug}</p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {FEATURE_DOTS.map(f => (
            <div key={f.key} title={f.label}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: features[f.key] !== false ? f.color : '#262626' }} />
          ))}
        </div>

        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 min-w-[60px]">
          <Users size={11} className="text-neutral-700" />
          <span className="text-sm font-medium text-neutral-400 tabular-nums">{empCount}</span>
        </div>

        <p className="hidden lg:block text-xs text-neutral-700 flex-shrink-0 min-w-[90px] text-right">
          {timeAgo}
        </p>
      </Link>

      <EnterOrgButton orgId={org.id} orgName={org.name} />

      <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer"
        className="text-neutral-700 hover:text-white transition-colors flex-shrink-0 p-1 opacity-0 group-hover:opacity-100">
        <ExternalLink size={12} />
      </a>

      <ChevronRight size={13} className="text-neutral-800 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
    </div>
  )
}

interface Props {
  orgs: Org[]
  counts: Record<string, number>
}

export function OrgsPageClient({ orgs, counts }: Props) {
  const [widgetEnabled, setWidgetEnabled] = useState(false)

  useEffect(() => {
    setWidgetEnabled(localStorage.getItem('sa_widget') === 'true')
  }, [])

  function toggleWidget() {
    setWidgetEnabled(v => {
      localStorage.setItem('sa_widget', String(!v))
      return !v
    })
  }

  const sandboxOrgs = orgs.filter(o => o.is_sandbox)
  const regularOrgs = orgs.filter(o => !o.is_sandbox)
  const totalEmps   = Object.values(counts).reduce((a, b) => a + b, 0)
  const liveCount   = regularOrgs.filter(o => o.is_live !== false).length

  return (
    <div className="relative min-h-screen p-6 md:p-10 overflow-hidden" style={{ background: '#000' }}>
      <FloatingMessages enabled={widgetEnabled} />

      <div className="relative max-w-4xl mx-auto" style={{ zIndex: 1 }}>

        {/* Header */}
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-2"
              style={{ color: 'rgba(99,102,241,0.8)' }}>
              Workspace management
            </p>
            <h1 className="text-3xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.45) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
              Organisations
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleWidget}
              title={widgetEnabled ? 'Turn off vibes' : 'Turn on vibes ✨'}
              className="p-2 rounded-lg border transition-all"
              style={{
                borderColor: widgetEnabled ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)',
                background:  widgetEnabled ? 'rgba(168,85,247,0.12)' : 'transparent',
                color:       widgetEnabled ? '#c084fc' : '#404040',
              }}
            >
              <Sparkles size={14} />
            </button>
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
                <OrgRow key={org.id} org={org} empCount={counts[org.id] ?? 0} isFirst={i === 0} />
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
              <OrgRow key={org.id} org={org} empCount={counts[org.id] ?? 0} isFirst={i === 0} />
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
