'use client'

import { useState } from 'react'
import { Employee, Lead, OfflineLeadApproval } from '@/types'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/leads/StageBadge'
import { timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props { admin: Employee; approvals: OfflineLeadApproval[] }

export function OfflineApprovalsClient({ admin, approvals: initialApprovals }: Props) {
  const [approvals, setApprovals] = useState(initialApprovals)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(approval: OfflineLeadApproval, action: 'approved' | 'rejected') {
    setLoading(approval.id)

    const res = await fetch('/api/offline-approvals/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: approval.id, lead_id: approval.lead_id, action }),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error || 'Failed to update')
    } else {
      setApprovals(prev => prev.map(a => a.id === approval.id ? { ...a, status: action } : a))
      toast.success(`Lead ${action}`)
    }
    setLoading(null)
  }

  const pending = approvals.filter(a => a.status === 'pending')
  const others = approvals.filter(a => a.status !== 'pending')
  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Offline/Referral Lead Approvals</h1>

      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-yellow-800">{pending.length} pending approvals</p>
        </div>
      )}

      <div className="space-y-3">
        {[...pending, ...others].map(a => {
          const lead = a.lead as Lead
          const submitter = a.submitter as Employee
          return (
            <div key={a.id} className={`bg-white rounded-xl border p-4 ${a.status === 'pending' ? 'border-yellow-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/leads/${a.lead_id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                      {lead?.name}
                    </Link>
                    <span className="text-xs text-slate-500">{lead?.phone}</span>
                    <StageBadge stage={lead?.main_stage || '0'} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Submitted by <strong>{submitter?.name}</strong> • {timeAgo(a.created_at)}
                    {lead?.source && <span className="ml-1 capitalize">• {lead.source}</span>}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${statusColors[a.status]}`}>{a.status}</span>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" loading={loading === a.id} onClick={() => handleAction(a, 'approved')}>
                    <CheckCircle size={12} />Approve
                  </Button>
                  <Button size="sm" variant="danger" loading={loading === a.id} onClick={() => handleAction(a, 'rejected')}>
                    <XCircle size={12} />Reject
                  </Button>
                </div>
              )}
            </div>
          )
        })}
        {approvals.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No approval requests</p>}
      </div>
    </div>
  )
}
