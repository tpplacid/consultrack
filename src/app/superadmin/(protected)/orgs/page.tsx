import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Building2, Users, Plus, ExternalLink, ChevronRight } from 'lucide-react'

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
    .select('id, name, slug, created_at, features')
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

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1.5"
              style={{ color: 'rgba(45,212,191,0.6)' }}>
              Workspace management
            </p>
            <h1 className="text-3xl font-bold text-white">Organisations</h1>
          </div>
          <Link
            href="/superadmin/orgs/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-white"
            style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', boxShadow: '0 4px 14px rgba(20,184,166,0.35)' }}
          >
            <Plus size={15} />
            New Organisation
          </Link>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total orgs',      value: orgs?.length ?? 0,                                color: 'text-white' },
            { label: 'Total employees', value: Object.values(counts).reduce((a, b) => a + b, 0), color: 'text-teal-400' },
            { label: 'Active',          value: orgs?.length ?? 0,                                color: 'text-green-400' },
          ].map(s => (
            <div key={s.label}
              className="rounded-xl px-4 py-3 border border-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Org list */}
        {!orgs || orgs.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <Building2 size={22} className="text-teal-400" />
            </div>
            <p className="text-slate-300 font-semibold mb-1">No organisations yet</p>
            <p className="text-sm text-slate-500">Create your first organisation to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orgs.map(org => {
              const features = (org.features ?? {}) as Record<string, boolean>
              const empCount = counts[org.id] ?? 0
              const enabledFeatures  = FEATURE_DOTS.filter(f => features[f.key] !== false)
              const disabledFeatures = FEATURE_DOTS.filter(f => features[f.key] === false)
              const initial = org.name?.charAt(0)?.toUpperCase() ?? '?'
              const timeAgo = org.created_at
                ? formatDistanceToNow(new Date(org.created_at), { addSuffix: true })
                : ''

              return (
                /* Wrapper div — avoids nesting <a> inside <a> (Link renders as <a>) */
                <div key={org.id}
                  className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-teal-500/[0.06] hover:border-teal-500/30 transition-all group">

                  {/* Clickable main area → org detail */}
                  <Link href={`/superadmin/orgs/${org.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base"
                      style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.25) 0%, rgba(13,148,136,0.15) 100%)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.2)' }}
                    >
                      {initial}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate mb-0.5">{org.name}</p>
                      <p className="text-slate-500 text-xs truncate">/{org.slug}</p>
                    </div>

                    {/* Feature dots */}
                    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                      {enabledFeatures.map(f => (
                        <div key={f.key} title={f.label}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: f.color }} />
                      ))}
                      {disabledFeatures.map(f => (
                        <div key={f.key} title={`${f.label} (disabled)`}
                          className="w-2 h-2 rounded-full opacity-20"
                          style={{ backgroundColor: f.color }} />
                      ))}
                    </div>

                    {/* Employee count */}
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 min-w-[64px]">
                      <Users size={12} className="text-slate-500" />
                      <span className="text-sm font-semibold text-slate-300">{empCount}</span>
                      <span className="text-xs text-slate-600">emp</span>
                    </div>

                    {/* Time */}
                    <div className="hidden lg:block text-xs text-slate-600 flex-shrink-0 min-w-[100px] text-right">
                      {timeAgo}
                    </div>
                  </Link>

                  {/* External link — separate from inner Link, no nesting */}
                  <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-slate-600 hover:text-teal-400 transition-colors flex-shrink-0 p-1">
                    <ExternalLink size={13} />
                  </a>

                  <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        {orgs && orgs.length > 0 && (
          <div className="flex items-center gap-4 mt-6 flex-wrap">
            <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide">Feature legend</p>
            {FEATURE_DOTS.map(f => (
              <div key={f.key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                <span className="text-[10px] text-slate-500">{f.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
