'use client'

import { useState, useMemo, useEffect } from 'react'
import { Employee, Lead } from '@/types'
import { LeadCard } from '@/components/leads/LeadCard'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Bell, SlidersHorizontal, ChevronDown, X, AlertTriangle, CalendarClock, Sparkles } from 'lucide-react'
import { NewLeadModal } from './NewLeadModal'
import { createClient } from '@/lib/supabase/client'
import { NotificationBanner } from '@/components/NotificationBanner'
import { useOrgConfig } from '@/context/OrgConfigContext'

type QuickFilter =
  | 'all' | 'hot' | 'followup' | 'closed'
  | 'breached' | 'followup_today' | 'new_leads'

interface Props {
  employee: Employee
  leads: Lead[]
  approvalMap: Record<string, string>
  stats: { total: number; hot: number; followup: number; closed: number; totalPayments: number }
}

const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  all:           'All Leads',
  hot:           'Hot Leads',
  followup:      'Follow Up',
  closed:        'Closed Won',
  breached:      'Deadline Breached',
  followup_today:'Follow Up Today',
  new_leads:     'New Leads',
}

export function DashboardClient({ employee, leads: initialLeads, approvalMap: initialApprovalMap, stats }: Props) {
  const { stages } = useOrgConfig()
  const [leads, setLeads] = useState(initialLeads)
  const [approvalMap, setApprovalMap] = useState<Record<string, string>>(initialApprovalMap)
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showNewLead, setShowNewLead] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const leadsChannel = supabase
      .channel('dashboard-leads')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'leads',
        filter: `owner_id=eq.${employee.id}`,
      }, (p) => {
        setLeads(prev => [p.new as Lead, ...prev])
        setNewLeadIds(prev => new Set([...prev, (p.new as Lead).id]))
      })
      .subscribe()

    const approvalChannel = supabase
      .channel('dashboard-approvals')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'offline_lead_approvals',
        filter: `submitted_by=eq.${employee.id}`,
      }, (p) => {
        const { lead_id, status } = p.new as { lead_id: string; status: string }
        setApprovalMap(prev => ({ ...prev, [lead_id]: status }))
        if (status === 'approved') {
          setNewLeadIds(prev => new Set([...prev, lead_id]))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(approvalChannel)
    }
  }, [employee.id])

  const newCount = newLeadIds.size

  // Base visible leads (rejection filter only)
  const visibleLeads = useMemo(() => leads.filter(lead => {
    if (lead.source === 'meta') return true
    if (lead.approved) return true
    if (approvalMap[lead.id] === 'rejected') return false
    return true
  }), [leads, approvalMap])

  // Alert counts (computed from all visible leads, not affected by other filters)
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const TERMINAL = new Set(['E', 'F', 'G', 'X', 'Y'])

  const alertCounts = useMemo(() => ({
    breached:      visibleLeads.filter(l => l.sla_deadline && l.sla_deadline < now && !TERMINAL.has(l.main_stage)).length,
    followup_today:visibleLeads.filter(l => l.next_followup_at?.slice(0, 10) === today).length,
    new_leads:     visibleLeads.filter(l => l.main_stage === '0').length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [visibleLeads])

  function applyQuickFilter(leads: Lead[], qf: QuickFilter | null): Lead[] {
    if (!qf || qf === 'all') return leads
    if (qf === 'hot')           return leads.filter(l => l.main_stage === 'C')
    if (qf === 'followup')      return leads.filter(l => l.main_stage === 'B')
    if (qf === 'closed')        return leads.filter(l => l.main_stage === 'F')
    if (qf === 'breached')      return leads.filter(l => l.sla_deadline && l.sla_deadline < now && !TERMINAL.has(l.main_stage))
    if (qf === 'followup_today')return leads.filter(l => l.next_followup_at?.slice(0, 10) === today)
    if (qf === 'new_leads')     return leads.filter(l => l.main_stage === '0')
    return leads
  }

  const filtered = useMemo<Lead[]>(() => {
    let l = visibleLeads
    if (search) { const q = search.toLowerCase(); l = l.filter(x => x.name.toLowerCase().includes(q) || x.phone.includes(q)) }
    if (stageFilter) l = l.filter(x => x.main_stage === stageFilter as Lead['main_stage'])
    if (sourceFilter) l = l.filter(x => x.source === sourceFilter)
    if (dateFrom) l = l.filter(x => x.created_at >= dateFrom)
    if (dateTo) l = l.filter(x => x.created_at <= dateTo + 'T23:59:59')
    l = applyQuickFilter(l, quickFilter)
    return [...l].sort((a, b) => {
      const aNew = newLeadIds.has(a.id) ? 0 : 1
      const bNew = newLeadIds.has(b.id) ? 0 : 1
      return aNew - bNew || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLeads, search, stageFilter, sourceFilter, dateFrom, dateTo, quickFilter, newLeadIds])

  function toggleQuick(f: QuickFilter) {
    setQuickFilter(prev => prev === f ? null : f)
  }

  function isPendingOffline(lead: Lead) {
    if (lead.source === 'meta') return false
    if (lead.approved) return false
    return !approvalMap[lead.id] || approvalMap[lead.id] === 'pending'
  }

  const canCreateLead = ['ad', 'tl', 'counsellor', 'telesales'].includes(employee.role)

  // Stat card config — clickable ones have a quickFilter key
  const statCards: { label: string; value: string; desc: string; filter: QuickFilter | null }[] = [
    { label: 'Total Leads',    value: stats.total.toString(),                            desc: 'All active leads',            filter: 'all'     },
    { label: 'Hot Leads',      value: stats.hot.toString(),                              desc: 'High intent',                 filter: 'hot'     },
    { label: 'Follow Up',      value: stats.followup.toString(),                         desc: 'Scheduled callbacks',         filter: 'followup'},
    { label: 'Closed Won',     value: stats.closed.toString(),                           desc: 'Confirmed deals',             filter: 'closed'  },
    { label: 'Total Payments', value: `₹${stats.totalPayments.toLocaleString('en-IN')}`, desc: 'Application + Booking + Tuition', filter: null  },
  ]

  // Alert chip config
  const alertChips: { label: string; count: number; filter: QuickFilter; icon: React.ReactNode }[] = [
    { label: 'Deadline Breached', count: alertCounts.breached,       filter: 'breached',       icon: <AlertTriangle size={12} /> },
    { label: 'Follow Up Today',   count: alertCounts.followup_today, filter: 'followup_today', icon: <CalendarClock size={12} /> },
    { label: 'New Leads',         count: alertCounts.new_leads,      filter: 'new_leads',      icon: <Sparkles size={12} />     },
  ]

  return (
    <>
      <NotificationBanner employeeId={employee.id} orgId={employee.org_id} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-800">My Leads</h1>
            <p className="text-sm text-brand-500 mt-0.5">Welcome back, {employee.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {newCount > 0 && (
              <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Bell size={12} />
                {newCount} new this session
              </div>
            )}
            {canCreateLead && (
              <Button size="sm" onClick={() => setShowNewLead(true)}>
                <Plus size={15} />
                New Lead
              </Button>
            )}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="space-y-2">
          <p className="text-[8px] text-brand-400 font-semibold">Click a card to filter leads</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map(s => {
              const active = quickFilter === s.filter && s.filter !== null
              const clickable = s.filter !== null
              return (
                <button
                  key={s.label}
                  type="button"
                  disabled={!clickable}
                  onClick={() => s.filter && toggleQuick(s.filter)}
                  className={`text-left bg-white rounded-xl border p-4 shadow-sm transition-all ${
                    !clickable
                      ? 'cursor-default border-brand-100'
                      : active
                        ? 'border-brand-400 ring-2 ring-brand-100 cursor-pointer'
                        : 'border-brand-100 hover:border-brand-300 cursor-pointer'
                  }`}
                >
                  <p className="text-xs font-semibold text-brand-600">{s.label}</p>
                  <p className="text-2xl font-bold mt-1 text-brand-800 truncate">{s.value}</p>
                  <p className="text-[8px] text-brand-400 mt-1">{s.desc}</p>
                </button>
              )
            })}
          </div>

          {/* ── Alert chips ── */}
          <div className="flex flex-wrap gap-2 pt-1">
            {alertChips.map(c => {
              const active = quickFilter === c.filter
              return (
                <button
                  key={c.filter}
                  type="button"
                  onClick={() => toggleQuick(c.filter)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    active
                      ? 'bg-brand-800 text-white border-brand-800'
                      : c.count > 0
                        ? 'bg-white text-brand-700 border-brand-200 hover:border-brand-400'
                        : 'bg-white text-brand-300 border-brand-100 cursor-default'
                  }`}
                >
                  {c.icon}
                  {c.label}
                  <span className={`font-bold tabular-nums ${active ? 'text-white/80' : c.count > 0 ? 'text-brand-500' : 'text-brand-300'}`}>
                    {c.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…"
                className="w-full pl-9 pr-3 py-2 border border-brand-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm" />
            </div>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-semibold transition-colors shadow-sm whitespace-nowrap ${
                filtersOpen || stageFilter || sourceFilter || dateFrom || dateTo
                  ? 'border-brand-400 bg-brand-50 text-brand-600'
                  : 'border-brand-200 bg-white text-brand-500 hover:border-brand-400'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {(stageFilter || sourceFilter || dateFrom || dateTo) && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-400 text-white text-[9px] font-bold">
                  {[stageFilter, sourceFilter, dateFrom, dateTo].filter(Boolean).length}
                </span>
              )}
              <ChevronDown size={13} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {filtersOpen && (
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
                className="px-3 py-2 border border-brand-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm text-brand-700">
                <option value="">All Stages</option>
                {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                className="px-3 py-2 border border-brand-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm text-brand-700">
                <option value="">All Sources</option>
                <option value="meta">Meta</option>
                <option value="offline">Offline</option>
                <option value="referral">Referral</option>
              </select>
              <div className="flex items-center gap-1.5 border border-brand-200 rounded-xl bg-white px-3 py-2 shadow-sm">
                <span className="text-xs text-brand-400 whitespace-nowrap">From</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none text-brand-700 w-full" />
              </div>
              <div className="flex items-center gap-1.5 border border-brand-200 rounded-xl bg-white px-3 py-2 shadow-sm">
                <span className="text-xs text-brand-400 whitespace-nowrap">To</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none text-brand-700 w-full" />
              </div>
            </div>
          )}
        </div>

        {/* ── Active quick filter pill ── */}
        {quickFilter && quickFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-500">Showing:</span>
            <span className="inline-flex items-center gap-1.5 bg-brand-800 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {QUICK_FILTER_LABELS[quickFilter]}
              <span className="text-white/60 text-[10px] tabular-nums">({filtered.length})</span>
              <button onClick={() => setQuickFilter(null)} className="ml-0.5 text-white/70 hover:text-white transition-colors" title="Clear filter">
                <X size={11} />
              </button>
            </span>
          </div>
        )}

        {/* ── Lead cards ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-brand-300">
            <p className="text-lg font-semibold text-brand-500">No leads found</p>
            <p className="text-sm mt-1 text-brand-400">
              {quickFilter ? 'No leads match this filter.' : 'Adjust your filters or add a new lead to get started.'}
            </p>
            {quickFilter && (
              <button onClick={() => setQuickFilter(null)} className="mt-3 text-sm text-brand-500 hover:text-brand-700 font-semibold underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                highlight={newLeadIds.has(lead.id)}
                pendingApproval={isPendingOffline(lead)}
              />
            ))}
          </div>
        )}

        <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} employee={employee} />
      </div>
    </>
  )
}
