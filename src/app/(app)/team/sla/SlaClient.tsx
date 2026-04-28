'use client'

import { useState } from 'react'
import { Employee, SlaBreach, Lead } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { StageBadge } from '@/components/leads/StageBadge'
import { formatDateTime, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { AlertTriangle, CheckCircle, MessageSquare, ExternalLink } from 'lucide-react'

interface Props { employee: Employee; breaches: SlaBreach[] }

export function SlaClient({ employee, breaches: initialBreaches }: Props) {
  const [breaches, setBreaches] = useState(initialBreaches)
  const [explanationModal, setExplanationModal] = useState<SlaBreach | null>(null)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [closing, setClosing] = useState(false)

  async function handleBulkClose() {
    if (bulkSelected.length === 0) return
    setClosing(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('sla_breaches')
      .update({ resolution: 'closed', resolved_by: employee.id })
      .in('id', bulkSelected)
    if (error) toast.error(error.message)
    else {
      setBreaches(prev => prev.map(b => bulkSelected.includes(b.id) ? { ...b, resolution: 'closed' as const } : b))
      setBulkSelected([])
      toast.success('Breaches closed')
    }
    setClosing(false)
  }

  async function handleRequestExplanation(breach: SlaBreach) {
    const supabase = createClient()
    const { error } = await supabase
      .from('sla_breaches')
      .update({ resolution: 'explanation_requested', explanation_status: 'pending' })
      .eq('id', breach.id)
    if (error) toast.error(error.message)
    else {
      setBreaches(prev => prev.map(b => b.id === breach.id ? { ...b, resolution: 'explanation_requested' as const, explanation_status: 'pending' as const } : b))
      toast.success('Explanation requested')
    }
    setExplanationModal(null)
  }

  const pending = breaches.filter(b => b.resolution === 'pending')
  const explanationRequested = breaches.filter(b => b.resolution === 'explanation_requested')
  const closed = breaches.filter(b => b.resolution === 'closed')

  function toggleSelect(id: string) {
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-brand-800">Deadline Breaches</h1>
        {bulkSelected.length > 0 && (
          <Button size="sm" variant="danger" onClick={handleBulkClose} loading={closing}>
            <CheckCircle size={14} />
            Close {bulkSelected.length} selected
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pending.length, color: 'text-red-600' },
          { label: 'Explanation Req.', value: explanationRequested.length, color: 'text-orange-600' },
          { label: 'Closed', value: closed.length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pending breaches */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Breaches</CardTitle>
              <button
                onClick={() => setBulkSelected(pending.map(b => b.id))}
                className="text-xs text-indigo-600 hover:underline"
              >
                Select all
              </button>
            </div>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {pending.map(b => (
              <div key={b.id} className="px-5 py-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={bulkSelected.includes(b.id)}
                  onChange={() => toggleSelect(b.id)}
                  className="mt-1 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/leads/${b.lead_id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                        {(b.lead as Lead & { current_owner?: Employee })?.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {((b.lead as Lead & { current_owner?: Employee })?.current_owner as Employee)?.name
                          || (b as unknown as Record<string,unknown>).breach_owner as string
                          || '—'}
                        {' '} — Stage {b.stage}
                      </p>
                    </div>
                    <StageBadge stage={b.stage} />
                  </div>
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    Breached {timeAgo(b.breached_at)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setExplanationModal(b)}>
                  <MessageSquare size={12} />
                  Request Explanation
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Explanation Requested */}
      {explanationRequested.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Awaiting Explanation</CardTitle></CardHeader>
          <div className="divide-y divide-slate-100">
            {explanationRequested.map(b => (
              <div key={b.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/leads/${b.lead_id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                      {(b.lead as Lead)?.name}
                    </Link>
                    <p className="text-xs text-slate-500">{(b.owner as Employee)?.name}</p>
                  </div>
                  <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">Awaiting explanation</span>
                </div>
                {b.explanation && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-xs font-medium text-green-700">Response:</p>
                    <p className="text-sm text-green-900">{b.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {breaches.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-300" />
          <p>No deadline breaches</p>
        </div>
      )}

      {explanationModal && (
        <Modal open={!!explanationModal} onClose={() => setExplanationModal(null)} title="Request Explanation">
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Request an explanation from <strong>{(explanationModal.owner as Employee)?.name}</strong> for the deadline breach on lead{' '}
              <strong>{(explanationModal.lead as Lead)?.name}</strong> (Stage {explanationModal.stage}).
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setExplanationModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => handleRequestExplanation(explanationModal)}>Send Request</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
