'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Employee, Lead, STAGE_LABELS } from '@/types'
import { LeadCard } from '@/components/leads/LeadCard'
import { Card, CardContent } from '@/components/ui/Card'
import { getInitials } from '@/lib/utils'

interface Props { manager: Employee; reports: Employee[]; leads: Lead[] }

export function TeamClient({ manager, reports, leads }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')

  const filtered = useMemo(() => {
    if (selectedEmployee === 'all') return leads
    return leads.filter(l => l.owner_id === selectedEmployee)
  }, [leads, selectedEmployee])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">My Team</h1>

      {/* Employee filter cards */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedEmployee('all')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm ${selectedEmployee === 'all' ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-200 bg-white text-slate-600'}`}
        >
          All ({leads.length})
        </button>
        {reports.map(r => {
          const count = leads.filter(l => l.owner_id === r.id).length
          return (
            <button
              key={r.id}
              onClick={() => setSelectedEmployee(r.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm ${selectedEmployee === r.id ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-200 bg-white text-slate-600'}`}
            >
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                {getInitials(r.name)}
              </div>
              {r.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Stage summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {['A','B','C','D','F'].map(stage => (
          <div key={stage} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">{STAGE_LABELS[stage as keyof typeof STAGE_LABELS]}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{filtered.filter(l => l.main_stage === stage).length}</p>
            <p className="text-xs text-slate-400">{stage}</p>
          </div>
        ))}
      </div>

      {/* Leads */}
      {filtered.length === 0 ? (
        <p className="text-center py-10 text-slate-400">No leads</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(l => <LeadCard key={l.id} lead={l} />)}
        </div>
      )}
    </div>
  )
}
