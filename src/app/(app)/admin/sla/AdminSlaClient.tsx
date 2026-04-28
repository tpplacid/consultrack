'use client'

import { useState } from 'react'
import { Employee, Lead, SlaBreach } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/leads/StageBadge'
import { formatDateTime, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { CheckCircle, MessageSquare, AlertTriangle } from 'lucide-react'

interface Props { admin: Employee; breaches: SlaBreach[] }

export function AdminSlaClient({ admin, breaches: initialBreaches }: Props) {
  const [breaches, setBreaches] = useState(initialBreaches)
  const [resolutionFilter, setResolutionFilter] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  async function closeBreach(breach: SlaBreach) {
    setLoading(breach.id)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('sla_breaches')
      .update({ resolution: 'closed', resolved_by: admin.id })
      .eq('id', breach.id)
      .select().single()
    if (error) toast.error(error.message)
    else {
      setBreaches(prev => prev.map(b => b.id === data.id ? { ...data, lead: b.lead, breach_owner: (b as unknown as Record<string,unknown>).breach_owner } : b))
      toast.success('Breach closed')
    }
    setLoading(null)
  }

  async function requestExplanation(breach: SlaBreach) {
    setLoading(breach.id)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('sla_breaches')
      .update({ resolution: 'explanation_requested', explanation_status: 'pending' })
      .eq('id', breach.id)
      .select().single()
    if (error) toast.error(error.message)
    else {
      setBreaches(prev => prev.map(b => b.id === data.id ? { ...data, lead: b.lead, breach_owner: (b as unknown as Record<string,unknown>).breach_owner } : b))
      toast.success('Explanation requested')
    }
    setLoading(null)
  }

  const filtered = resolutionFilter ? breaches.filter(b => b.resolution === resolutionFilter) : breaches
  const counts = { pending: breaches.filter(b => b.resolution === 'pending').length, explanation_requested: breaches.filter(b => b.resolution === 'explanation_requested').length, closed: breaches.filter(b => b.resolution === 'closed').length }
  const statusColors = { pending: 'bg-red-100 text-red-700', explanation_requested: 'bg-orange-100 text-orange-700', closed: 'bg-green-100 text-green-700' }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Deadline Breach Log</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: counts.pending, color: 'text-red-600', key: 'pending' },
          { label: 'Explanation Requested', value: counts.explanation_requested, color: 'text-orange-600', key: 'explanation_requested' },
          { label: 'Closed', value: counts.closed, color: 'text-green-600', key: 'closed' },
        ].map(s => (
          <button key={s.key} onClick={() => setResolutionFilter(resolutionFilter === s.key ? '' : s.key)}
            className={`bg-white border rounded-xl p-4 text-left transition-all ${resolutionFilter === s.key ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {resolutionFilter && (
        <button onClick={() => setResolutionFilter('')} className="text-xs text-indigo-600 hover:underline">
          Clear filter
        </button>
      )}

      <div className="space-y-3">
        {filtered.map(b => {
          const lead = b.lead as Lead & { current_owner?: Employee }
          const breachOwner = (b as unknown as Record<string, unknown>).breach_owner as Employee | undefined
          const currentOwner = lead?.current_owner as Employee | undefined
          const transferred = breachOwner && currentOwner && breachOwner.id !== currentOwner.id
          return (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/leads/${b.lead_id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                      {lead?.name}
                    </Link>
                    <StageBadge stage={b.stage} />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[b.resolution]}`}>{b.resolution.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Current owner: <strong>{currentOwner?.name || breachOwner?.name || '—'}</strong>
                    {transferred && (
                      <span className="ml-1 text-amber-600 font-medium">(transferred from {breachOwner?.name})</span>
                    )}
                    {' '}• Breached {timeAgo(b.breached_at)}
                  </p>
                  {b.explanation && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-xs font-medium text-blue-700">Explanation:</p>
                      <p className="text-sm text-blue-900">{b.explanation}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {b.resolution === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" loading={loading === b.id} onClick={() => requestExplanation(b)}>
                        <MessageSquare size={12} />Explain
                      </Button>
                      <Button size="sm" variant="secondary" loading={loading === b.id} onClick={() => closeBreach(b)}>
                        <CheckCircle size={12} />Close
                      </Button>
                    </>
                  )}
                  {b.resolution === 'explanation_requested' && (
                    <Button size="sm" variant="secondary" loading={loading === b.id} onClick={() => closeBreach(b)}>
                      <CheckCircle size={12} />Close
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-300" />
            <p>No breaches{resolutionFilter ? ' in this category' : ''}</p>
          </div>
        )}
      </div>
    </div>
  )
}
