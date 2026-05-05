'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Users, Plus, ExternalLink, ChevronRight, Radio, FlaskConical, AlertTriangle } from 'lucide-react'
import { EnterOrgButton } from './EnterOrgButton'

const FEATURE_DOTS: { key: string; label: string; color: string }[] = [
  { key: 'lead_crm',   label: 'CRM',        color: 'var(--sa-accent-3)' },
  { key: 'pipeline',   label: 'Pipeline',   color: 'var(--sa-accent-4)' },
  { key: 'sla',        label: 'SLA',        color: 'var(--sa-accent-2)' },
  { key: 'attendance', label: 'Attendance', color: 'var(--sa-accent-3)' },
  { key: 'roles',      label: 'Roles',      color: 'var(--sa-accent)'   },
  { key: 'meta',       label: 'Meta',       color: 'var(--sa-accent-4)' },
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

  // Quota state
  const limit     = (org.lead_limit ?? null) as number | null
  const pct       = limit && limit > 0 ? Math.round((leadCount / limit) * 100) : 0
  const overLimit = limit !== null && leadCount >= limit
  const nearLimit = limit !== null && pct >= 80 && !overLimit

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-3.5 transition-all group hover:bg-[var(--sa-surface-hover)]"
      style={{
        borderTop: !isFirst ? '1px solid var(--sa-divider)' : 'none',
        boxShadow: overLimit
          ? 'inset 4px 0 0 0 var(--sa-danger)'
          : nearLimit
            ? 'inset 4px 0 0 0 var(--sa-accent-2)'
            : 'none',
      }}
    >
      <Link href={`/superadmin/orgs/${org.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
        {org.logo_url ? (
          <img src={org.logo_url} alt={org.name}
            className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
            style={{ background: 'var(--sa-surface-strong)', border: '1.5px solid var(--sa-border)' }} />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{
              background: 'var(--sa-surface-strong)',
              color: 'var(--sa-text)',
              border: '2px solid var(--sa-shadow-color)',
              boxShadow: `2px 2px 0 0 ${accent}`,
              transform: 'translate(-1px,-1px)',
            }}>
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate tracking-tight" style={{ color: 'var(--sa-text)' }}>{org.name}</p>
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 tracking-widest"
                style={{ background: 'var(--sa-success)', color: 'var(--sa-text-on-accent)' }}>
                <Radio size={6} className="fill-current" />LIVE
              </span>
            ) : (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 tracking-widest"
                style={{ background: 'var(--sa-surface-hover)', color: 'var(--sa-text-muted)' }}>
                OFFLINE
              </span>
            )}
            {limit !== null && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 tabular-nums"
                style={{
                  background: overLimit
                    ? 'var(--sa-danger)'
                    : nearLimit
                      ? 'var(--sa-accent-2)'
                      : 'color-mix(in srgb, var(--sa-text) 8%, transparent)',
                  color: overLimit || nearLimit ? 'var(--sa-text-on-accent)' : 'var(--sa-text-secondary)',
                }}
                title={`${leadCount.toLocaleString('en-IN')} of ${limit.toLocaleString('en-IN')} leads used`}
              >
                {overLimit && <AlertTriangle size={8} />}
                {leadCount.toLocaleString('en-IN')}/{limit.toLocaleString('en-IN')} · {pct}%
              </span>
            )}
          </div>
          <p className="text-xs truncate mt-0.5 font-mono" style={{ color: 'var(--sa-text-muted)' }}>/{org.slug}</p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {FEATURE_DOTS.map(f => (
            <div key={f.key} title={f.label}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: features[f.key] !== false ? f.color : 'color-mix(in srgb, var(--sa-text) 15%, transparent)',
              }} />
          ))}
        </div>

        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 min-w-[60px]">
          <Users size={11} style={{ color: 'var(--sa-text-muted)' }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--sa-text)' }}>{empCount}</span>
        </div>

        <p className="hidden lg:block text-xs font-medium flex-shrink-0 min-w-[90px] text-right" style={{ color: 'var(--sa-text-secondary)' }}>
          {timeAgo}
        </p>
      </Link>

      <EnterOrgButton orgId={org.id} orgName={org.name} />

      <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer"
        className="transition-colors flex-shrink-0 p-1 opacity-0 group-hover:opacity-100"
        style={{ color: 'var(--sa-text-muted)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)' }}>
        <ExternalLink size={12} />
      </a>

      <ChevronRight size={13} className="transition-colors flex-shrink-0" style={{ color: 'var(--sa-text-muted)' }} />
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
    <div className="relative min-h-screen p-4 md:p-10" style={{ color: 'var(--sa-text)' }}>
      <div className="relative max-w-4xl mx-auto" style={{ zIndex: 10 }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between mb-8 md:mb-10 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-2"
              style={{ color: 'var(--sa-accent)' }}>
              Workspace management
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--sa-text)' }}>
              Organisations
            </h1>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/superadmin/orgs/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: 'var(--sa-accent)',
                color: 'var(--sa-text-on-accent)',
                border: '2px solid var(--sa-shadow-color)',
                boxShadow: '4px 4px 0 0 var(--sa-shadow-color)',
                transform: 'translate(-1px,-1px)',
              }}
            >
              <Plus size={14} />
              New org
            </Link>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total orgs',      value: regularOrgs.length, accent: 'var(--sa-accent)'   },
            { label: 'Total employees', value: totalEmps,           accent: 'var(--sa-accent-3)' },
            { label: 'Live',            value: liveCount,           accent: 'var(--sa-success)'  },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3"
              style={{
                background: 'var(--sa-surface-strong)',
                border: '2px solid var(--sa-shadow-color)',
                boxShadow: `4px 4px 0 0 ${s.accent}`,
                transform: 'translate(-1px,-1px)',
              }}>
              <p className="text-2xl font-black tabular-nums" style={{ color: s.accent }}>{s.value}</p>
              <p className="text-[11px] mt-0.5 font-bold" style={{ color: 'var(--sa-text-secondary)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sandbox group */}
        {sandboxOrgs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={11} style={{ color: 'var(--sa-accent-2)' }} />
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: 'var(--sa-accent-2)' }}>
                Sandbox
              </p>
            </div>
            <div className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--sa-surface)',
                border: '2px solid var(--sa-accent-2)',
                boxShadow: '4px 4px 0 0 var(--sa-accent-2)',
                transform: 'translate(-1px,-1px)',
              }}>
              {sandboxOrgs.map((org, i) => (
                <OrgRow key={org.id} org={org} empCount={counts[org.id] ?? 0} leadCount={leadCounts[org.id] ?? 0} isFirst={i === 0} accent="var(--sa-accent-2)" />
              ))}
            </div>
          </div>
        )}

        {/* Regular orgs */}
        {regularOrgs.length === 0 ? (
          <div className="text-center py-20 rounded-xl"
            style={{
              background: 'var(--sa-surface)',
              border: '2px dashed var(--sa-border-strong)',
            }}>
            <Building2 size={20} className="mx-auto mb-3" style={{ color: 'var(--sa-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--sa-text-secondary)' }}>No organisations yet</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{
              background: 'var(--sa-surface)',
              border: '2px solid var(--sa-shadow-color)',
              boxShadow: '4px 4px 0 0 var(--sa-shadow-color)',
              transform: 'translate(-1px,-1px)',
            }}>
            {regularOrgs.map((org, i) => (
              <OrgRow key={org.id} org={org} empCount={counts[org.id] ?? 0} leadCount={leadCounts[org.id] ?? 0} isFirst={i === 0} accent="var(--sa-accent)" />
            ))}
          </div>
        )}

        {/* Feature legend */}
        {regularOrgs.length > 0 && (
          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--sa-text-muted)' }}>Features</p>
            {FEATURE_DOTS.map(f => (
              <div key={f.key} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />
                <span className="text-[10px]" style={{ color: 'var(--sa-text-secondary)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
