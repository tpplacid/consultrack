import Link from 'next/link'
import { Lead } from '@/types'
import { StageBadge } from './StageBadge'
import { formatDateTime, isOverdue } from '@/lib/utils'
import { Phone, Clock, AlertTriangle } from 'lucide-react'

export function LeadCard({ lead }: { lead: Lead }) {
  const overdue = isOverdue(lead.sla_deadline)
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className={`bg-white rounded-xl border p-4 hover:border-indigo-300 hover:shadow-sm transition-all ${overdue ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{lead.name}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <Phone size={11} />
              <span>{lead.phone}</span>
            </div>
          </div>
          <StageBadge stage={lead.main_stage} />
        </div>

        {lead.sub_stage && (
          <p className="text-xs text-slate-500 mb-2">{lead.sub_stage}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">{lead.source}</span>
          {lead.preferred_course && (
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{lead.preferred_course}</span>
          )}
        </div>

        {lead.sla_deadline && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
            {overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
            <span>SLA: {formatDateTime(lead.sla_deadline)}</span>
          </div>
        )}

        {lead.next_followup_at && (
          <div className="flex items-center gap-1 mt-1 text-xs text-indigo-600">
            <Clock size={11} />
            <span>Follow-up: {formatDateTime(lead.next_followup_at)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
