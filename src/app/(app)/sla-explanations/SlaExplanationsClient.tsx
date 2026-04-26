'use client'

import { useState } from 'react'
import { Employee, SlaBreach, Lead } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StageBadge } from '@/components/leads/StageBadge'
import { timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

interface Props { employee: Employee; breaches: SlaBreach[] }

export function SlaExplanationsClient({ employee, breaches: initialBreaches }: Props) {
  const [breaches, setBreaches] = useState(initialBreaches)
  const [explanations, setExplanations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  async function submitExplanation(breach: SlaBreach) {
    const text = explanations[breach.id]?.trim()
    if (!text) return toast.error('Enter your explanation')
    setLoading(breach.id)
    const supabase = createClient()
    const { error } = await supabase
      .from('sla_breaches')
      .update({ explanation: text, explanation_status: 'resolved' })
      .eq('id', breach.id)
    if (error) toast.error(error.message)
    else {
      setBreaches(prev => prev.filter(b => b.id !== breach.id))
      toast.success('Explanation submitted')
    }
    setLoading(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Explanation Requests</h1>
      <p className="text-sm text-slate-500">Your manager has requested explanations for these deadline breaches.</p>

      {breaches.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MessageSquare size={40} className="mx-auto mb-3 text-slate-300" />
          <p>No pending explanation requests</p>
        </div>
      ) : breaches.map(b => {
        const lead = b.lead as Lead
        return (
          <Card key={b.id}>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/leads/${b.lead_id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                    {lead?.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <StageBadge stage={b.stage} />
                    <span className="text-xs text-slate-500">Breached {timeAgo(b.breached_at)}</span>
                  </div>
                </div>
                <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded flex-shrink-0">
                  Explanation needed
                </span>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Your Explanation</label>
                <textarea
                  value={explanations[b.id] || ''}
                  onChange={e => setExplanations(prev => ({ ...prev, [b.id]: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Explain what happened and your plan to resolve it…"
                />
              </div>
              <Button
                size="sm"
                loading={loading === b.id}
                disabled={!explanations[b.id]?.trim()}
                onClick={() => submitExplanation(b)}
              >
                Submit Explanation
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
