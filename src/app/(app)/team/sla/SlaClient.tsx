'use client'

import { useState } from 'react'
import { Employee, SlaBreach, Lead } from '@/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StageBadge } from '@/components/leads/StageBadge'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface Props { employee: Employee; breaches: SlaBreach[] }

export function SlaClient({ employee: _employee, breaches }: Props) {
  const [resolutionFilter, setResolutionFilter] = useState<string>('')

  const pending              = breaches.filter(b => b.resolution === 'pending')
  const explanationRequested = breaches.filter(b => b.resolution === 'explanation_requested')
  const closed               = breaches.filter(b => b.resolution === 'closed')

  const filtered = resolutionFilter
    ? breaches.filter(b => b.resolution === resolutionFilter)
    : [...pending, ...explanationRequested, ...closed]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-brand-800">Deadline Breaches</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',          value: pending.length,              color: 'text-red-600',    key: 'pending' },
          { label: 'Explanation Req.', value: explanationRequested.length, color: 'text-orange-600', key: 'explanation_requested' },
          { label: 'Closed',           value: closed.length,               color: 'text-green-600',  key: 'closed' },
        ].map(s => (
          <button key={s.key}
            onClick={() => setResolutionFilter(resolutionFilter === s.key ? '' : s.key)}
            className={`bg-white border rounded-xl p-4 text-left transition-all ${resolutionFilter === s.key ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'}`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {resolutionFilter && (
        <button onClick={() => setResolutionFilter('')} className="text-xs text-brand-500 hover:underline">
          Clear filter
        </button>
      )}

      {/* Breach list — read-only, no close/explain actions */}
      {filtered.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {resolutionFilter
                ? resolutionFilter.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
                : 'All Breaches'}
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {filtered.map(b => {
              const lead = b.lead as Lead | null
              const statusColors: Record<string, string> = {
                pending:               'bg-red-50 text-red-600',
                explanation_requested: 'bg-orange-50 text-orange-600',
                closed:                'bg-green-50 text-green-600',
              }
              return (
                <div key={b.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/leads/${b.lead_id}`} className="text-sm font-medium text-slate-900 hover:text-brand-600">
                          {lead?.name}
                        </Link>
                        <StageBadge stage={b.stage} />
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[b.resolution] ?? ''}`}>
                          {b.resolution.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Breached {timeAgo(b.breached_at)}
                      </p>
                      {b.explanation && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                          <p className="text-xs font-medium text-green-700">Your explanation:</p>
                          <p className="text-sm text-green-900">{b.explanation}</p>
                        </div>
                      )}
                      {b.resolution === 'explanation_requested' && !b.explanation && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">
                          Your manager has requested an explanation — check your Explanation Requests
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-300" />
          <p>No deadline breaches</p>
        </div>
      )}
    </div>
  )
}
