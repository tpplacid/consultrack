'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Employee, Lead, LeadStage, STAGE_LABELS } from '@/types'
import { LeadCard } from '@/components/leads/LeadCard'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, Search } from 'lucide-react'
import { NewLeadModal } from './NewLeadModal'

const STAGES: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Stages' },
  ...Object.entries(STAGE_LABELS).map(([k, v]) => ({ value: k, label: `${k} — ${v}` })),
]

interface Props {
  employee: Employee
  leads: Lead[]
  stats: { total: number; hot: number; followup: number; closed: number }
}

export function DashboardClient({ employee, leads, stats }: Props) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showNewLead, setShowNewLead] = useState(false)

  const filtered = useMemo(() => {
    let l = leads
    if (search) {
      const q = search.toLowerCase()
      l = l.filter(x => x.name.toLowerCase().includes(q) || x.phone.includes(q))
    }
    if (stageFilter) l = l.filter(x => x.main_stage === stageFilter)
    if (sourceFilter) l = l.filter(x => x.source === sourceFilter)
    return l
  }, [leads, search, stageFilter, sourceFilter])

  const canCreateLead = ['ad', 'tl', 'counsellor', 'telesales'].includes(employee.role)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Leads</h1>
          <p className="text-sm text-slate-500">Welcome back, {employee.name}</p>
        </div>
        {canCreateLead && (
          <Button size="sm" onClick={() => setShowNewLead(true)}>
            <Plus size={16} />
            New Lead
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700' },
          { label: 'Hot Leads', value: stats.hot, color: 'text-orange-600' },
          { label: 'Follow Up', value: stats.followup, color: 'text-yellow-600' },
          { label: 'Closed Won', value: stats.closed, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Sources</option>
          <option value="meta">Meta</option>
          <option value="offline">Offline</option>
          <option value="referral">Referral</option>
        </select>
      </div>

      {/* Lead Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No leads found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new lead.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(lead => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      )}

      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} employee={employee} />
    </div>
  )
}
