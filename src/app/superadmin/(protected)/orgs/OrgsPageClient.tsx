'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Users, Plus, ExternalLink, ChevronRight, FlaskConical, AlertTriangle } from 'lucide-react'
import { EnterOrgButton } from './EnterOrgButton'

const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }

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
}

// Tiny status dot — green = live, red = offline. Replaces the chip.
function StatusDot({ live }: { live: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      title={live ? 'Live' : 'Offline'}
      style={{
        background: live ? 'var(--sa-success)' : 'var(--sa-danger)',
        boxShadow: live
          ? '0 0 0 3px color-mix(in srgb, var(--sa-success) 22%, transparent)'
          : '0 0 0 3px color-mix(in srgb, var(--sa-danger) 22%, transparent)',
      }}
    />
  )
}

function OrgRow({ org, empCount, leadCount, isFirst }: RowProps) {
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
      className="relative flex items-center gap-3 px-4 py-3.5 transition-colors group"
      style={{
        borderTop: !isFirst ? '1px solid var(--sa-divider)' : 'none',
        boxShadow: overLimit
          ? 'inset 3px 0 0 0 var(--sa-danger)'
          : nearLimit
            ? 'inset 3px 0 0 0 var(--sa-accent-2)'
            : 'none',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-hover)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <Link href={`/superadmin/orgs/${org.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
        {org.logo_url ? (
          <img
            src={org.logo_url}
            alt={org.name}
            className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
            style={{ background: 'var(--sa-surface-hover)', border: '1px solid var(--sa-border)' }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--sa-accent) 12%, var(--sa-surface))',
              color: 'var(--sa-accent)',
              border: '1px solid var(--sa-border)',
            }}
          >
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusDot live={isLive} />
            <p className="text-sm font-semibold truncate tracking-tight" style={{ color: 'var(--sa-text)' }}>
              {org.name}
            </p>
            {limit !== null && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 tabular-nums"
                style={{
                  ...MONO,
                  background: overLimit
                    ? 'var(--sa-danger-bg)'
                    : nearLimit
                      ? 'color-mix(in srgb, var(--sa-accent-2) 18%, transparent)'
                      : 'color-mix(in srgb, var(--sa-text) 6%, transparent)',
                  color: overLimit
                    ? 'var(--sa-danger)'
                    : nearLimit
                      ? 'var(--sa-accent-2)'
                      : 'var(--sa-text-secondary)',
                }}
                title={`${leadCount.toLocaleString('en-IN')} of ${limit.toLocaleString('en-IN')} leads used`}
              >
                {overLimit && <AlertTriangle size={9} />}
                {leadCount.toLocaleString('en-IN')}/{limit.toLocaleString('en-IN')} · {pct}%
              </span>
            )}
          </div>
          <p className="text-xs truncate mt-0.5" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>/{org.slug}</p>
        </div>

        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 min-w-[60px]">
          <Users size={11} style={{ color: 'var(--sa-text-muted)' }} />
          <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--sa-text)' }}>{empCount}</span>
        </div>

        <p className="hidden lg:block text-xs flex-shrink-0 min-w-[90px] text-right" style={{ color: 'var(--sa-text-muted)' }}>
          {timeAgo}
        </p>
      </Link>

      <EnterOrgButton orgId={org.id} orgName={org.name} />

      <a
        href={`/${org.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors flex-shrink-0 p-1 opacity-0 group-hover:opacity-100"
        style={{ color: 'var(--sa-text-muted)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)' }}
      >
        <ExternalLink size={12} />
      </a>

      <ChevronRight size={13} className="flex-shrink-0" style={{ color: 'var(--sa-text-muted)' }} />
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
      <div className="relative max-w-5xl mx-auto" style={{ zIndex: 10 }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between mb-8 md:mb-10 gap-4">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase mb-2" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>
              Workspace management
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--sa-text)' }}>
              Organisations
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sa-text-secondary)' }}>
              {regularOrgs.length} active workspace{regularOrgs.length === 1 ? '' : 's'} · {totalEmps} employees total
            </p>
          </div>
          <Link
            href="/superadmin/orgs/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors self-end sm:self-auto"
            style={{
              background: 'var(--sa-accent)',
              color: 'var(--sa-text-on-accent)',
              boxShadow: 'var(--sa-shadow-sm)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-accent-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-accent)' }}
          >
            <Plus size={14} />
            New organisation
          </Link>
        </div>

        {/* Stat tiles — uniform clean cards, soft shadow, single accent for the value */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total organisations', value: regularOrgs.length },
            { label: 'Total employees',     value: totalEmps           },
            { label: 'Live workspaces',     value: liveCount           },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-lg px-4 py-3.5"
              style={{
                background: 'var(--sa-surface)',
                border: '1px solid var(--sa-border)',
                boxShadow: 'var(--sa-shadow-sm)',
              }}
            >
              <p className="text-[10px] tracking-[0.18em] uppercase" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>
                {s.label}
              </p>
              <p className="text-2xl font-semibold tabular-nums mt-1" style={{ color: 'var(--sa-text)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Sandbox group */}
        {sandboxOrgs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={11} style={{ color: 'var(--sa-accent-2)' }} />
              <p className="text-[10px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'var(--sa-accent-2)' }}>
                Sandbox
              </p>
            </div>
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--sa-surface)',
                border: '1px solid color-mix(in srgb, var(--sa-accent-2) 35%, var(--sa-border))',
                boxShadow: 'var(--sa-shadow-sm)',
              }}
            >
              {sandboxOrgs.map((org, i) => (
                <OrgRow
                  key={org.id}
                  org={org}
                  empCount={counts[org.id] ?? 0}
                  leadCount={leadCounts[org.id] ?? 0}
                  isFirst={i === 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular orgs */}
        {regularOrgs.length === 0 ? (
          <div
            className="text-center py-20 rounded-lg"
            style={{
              background: 'var(--sa-surface)',
              border: '1px dashed var(--sa-border-strong)',
            }}
          >
            <Building2 size={20} className="mx-auto mb-3" style={{ color: 'var(--sa-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--sa-text-secondary)' }}>No organisations yet</p>
          </div>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: 'var(--sa-surface)',
              border: '1px solid var(--sa-border)',
              boxShadow: 'var(--sa-shadow-sm)',
            }}
          >
            {regularOrgs.map((org, i) => (
              <OrgRow
                key={org.id}
                org={org}
                empCount={counts[org.id] ?? 0}
                leadCount={leadCounts[org.id] ?? 0}
                isFirst={i === 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
