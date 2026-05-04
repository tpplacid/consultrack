import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Users, Plus, ExternalLink, ChevronRight, Radio } from 'lucide-react'
import { EnterOrgButton } from './EnterOrgButton'

export const dynamic = 'force-dynamic'

const FEATURE_DOTS: { key: string; label: string; color: string }[] = [
  { key: 'lead_crm',   label: 'CRM',        color: '#14b8a6' },
  { key: 'pipeline',   label: 'Pipeline',   color: '#8b5cf6' },
  { key: 'sla',        label: 'SLA',        color: '#f59e0b' },
  { key: 'attendance', label: 'Attendance', color: '#3b82f6' },
  { key: 'roles',      label: 'Roles',      color: '#ec4899' },
  { key: 'meta',       label: 'Meta',       color: '#6366f1' },
]

export default async function SuperAdminOrgsPage() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const { data: orgs } = await supabase
    .from('orgs')
    .select('*')
    .order('created_at', { ascending: false })

  const orgIds = (orgs || []).map(o => o.id)
  const counts: Record<string, number> = {}
  if (orgIds.length > 0) {
    const { data: empData } = await supabase
      .from('employees')
      .select('org_id')
      .in('org_id', orgIds)
    for (const e of empData || []) {
      counts[e.org_id] = (counts[e.org_id] || 0) + 1
    }
  }

  const totalEmps = Object.values(counts).reduce((a, b) => a + b, 0)
  const liveCount = orgs?.filter(o => o.is_live !== false).length ?? 0

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: '#000' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-600 mb-2">
              Workspace management
            </p>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Organisations</h1>
          </div>
          <Link
            href="/superadmin/orgs/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} />
            New org
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total orgs',      value: orgs?.length ?? 0 },
            { label: 'Total employees', value: totalEmps },
            { label: 'Live',            value: liveCount },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3 border border-white/[0.08] bg-[#111]">
              <p className="text-xl font-semibold text-white tabular-nums">{s.value}</p>
              <p className="text-[11px] text-neutral-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Org list */}
        {!orgs || orgs.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-white/[0.08] bg-[#111]">
            <Building2 size={20} className="text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm font-medium">No organisations yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#111] overflow-hidden">
            {orgs.map((org, i) => {
              const features        = (org.features ?? {}) as Record<string, boolean>
              const empCount        = counts[org.id] ?? 0
              const enabledFeatures = FEATURE_DOTS.filter(f => features[f.key] !== false)
              const initial         = org.name?.charAt(0)?.toUpperCase() ?? '?'
              const timeAgo         = org.created_at
                ? formatDistanceToNow(new Date(org.created_at), { addSuffix: true })
                : ''
              const isLive = org.is_live !== false

              return (
                <div key={org.id}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.05] transition-colors group ${
                    i !== 0 ? 'border-t border-white/[0.07]' : ''
                  }`}>

                  {/* Main clickable area */}
                  <Link href={`/superadmin/orgs/${org.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Logo or initial */}
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-9 h-9 rounded-lg object-contain flex-shrink-0 bg-white/[0.05]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0 bg-white/[0.06] text-white">
                        {initial}
                      </div>
                    )}

                    {/* Name + slug + live badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{org.name}</p>
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                            <Radio size={6} className="fill-emerald-400" />LIVE
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/[0.05] text-neutral-600 border border-white/[0.07] flex-shrink-0">
                            OFFLINE
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600 text-xs truncate mt-0.5">/{org.slug}</p>
                    </div>

                    {/* Feature dots — keep colors */}
                    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                      {FEATURE_DOTS.map(f => (
                        <div key={f.key} title={f.label}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: features[f.key] !== false ? f.color : '#262626' }} />
                      ))}
                    </div>

                    {/* Employee count */}
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 min-w-[60px]">
                      <Users size={11} className="text-neutral-700" />
                      <span className="text-sm font-medium text-neutral-400 tabular-nums">{empCount}</span>
                    </div>

                    {/* Time */}
                    <p className="hidden lg:block text-xs text-neutral-700 flex-shrink-0 min-w-[90px] text-right">
                      {timeAgo}
                    </p>
                  </Link>

                  {/* Enter org as admin */}
                  <EnterOrgButton orgId={org.id} orgName={org.name} />

                  {/* External link */}
                  <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-neutral-700 hover:text-white transition-colors flex-shrink-0 p-1 opacity-0 group-hover:opacity-100">
                    <ExternalLink size={12} />
                  </a>

                  <ChevronRight size={13} className="text-neutral-800 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
                </div>
              )
            })}
          </div>
        )}

        {/* Feature legend */}
        {orgs && orgs.length > 0 && (
          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <p className="text-[10px] text-neutral-700 font-medium uppercase tracking-wide">Features</p>
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
