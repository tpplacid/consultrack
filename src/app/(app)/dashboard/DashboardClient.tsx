'use client'

import { useState, useMemo, useEffect } from 'react'
import { Employee, Lead, STAGE_LABELS } from '@/types'
import { LeadCard } from '@/components/leads/LeadCard'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Bell } from 'lucide-react'
import { NewLeadModal } from './NewLeadModal'
import { createClient } from '@/lib/supabase/client'
import { NotificationBanner } from '@/components/NotificationBanner'

const STAGES = [
  { value: '', label: 'All Stages' },
  ...Object.entries(STAGE_LABELS).map(([k, v]) => ({ value: k, label: `${k} — ${v}` })),
]

interface Props {
  employee: Employee
  leads: Lead[]
  stats: { total: number; hot: number; followup: number; closed: number }
}

export function DashboardClient({ employee, leads: initialLeads, stats }: Props) {
  const [leads, setLeads] = useState(initialLeads)
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showNewLead, setShowNewLead] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-leads')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'leads',
        filter: `owner_id=eq.${employee.id}`,
      }, (p) => {
        setLeads(prev => [p.new as Lead, ...prev])
        setNewLeadIds(prev => new Set([...prev, (p.new as Lead).id]))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [employee.id])

  const newCount = newLeadIds.size

  const filtered = useMemo(() => {
    let l = leads
    if (search) { const q = search.toLowerCase(); l = l.filter(x => x.name.toLowerCase().includes(q) || x.phone.includes(q)) }
    if (stageFilter) l = l.filter(x => x.main_stage === stageFilter as Lead['main_stage'])
    if (sourceFilter) l = l.filter(x => x.source === sourceFilter)
    return [...l].sort((a, b) => {
      const aNew = newLeadIds.has(a.id) ? 0 : 1
      const bNew = newLeadIds.has(b.id) ? 0 : 1
      return aNew - bNew || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [leads, search, stageFilter, sourceFilter, newLeadIds])

  const canCreateLead = ['ad', 'tl', 'counsellor', 'telesales'].includes(employee.role)

  return (
    <>
      <NotificationBanner employeeId={employee.id} orgId={employee.org_id} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Leads</h1>
            <p className="text-sm text-slate-500 mt-0.5">Welcome back, {employee.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {newCount > 0 && (
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-400/30 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: stats.total,    color: 'text-slate-800',   bg: 'bg-white',      accent: '#94a3b8' },
            { label: 'Hot Leads',  value: stats.hot,      color: 'text-orange-600',  bg: 'bg-orange-50',  accent: '#f97316' },
            { label: 'Follow Up',  value: stats.followup, color: 'text-amber-600',   bg: 'bg-amber-50',   accent: '#f59e0b' },
            { label: 'Closed Won', value: stats.closed,   color: 'text-indigo-600', bg: 'bg-indigo-50', accent: '#4f46e5' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-slate-200 p-4 shadow-sm`}>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: stats.total ? `${Math.min(100, (s.value / stats.total) * 100)}%` : '0%', background: s.accent }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          </div>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
            {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
            <option value="">All Sources</option>
            <option value="meta">Meta</option>
            <option value="offline">Offline</option>
            <option value="referral">Referral</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new lead.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(lead => (
              <LeadCard key={lead.id} lead={lead} highlight={newLeadIds.has(lead.id)} />
            ))}
          </div>
        )}

        <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} employee={employee} />
      </div>
    </>
  )
}
