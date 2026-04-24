import Link from 'next/link'
import { Lead } from '@/types'
import { StageBadge } from './StageBadge'
import { formatDateTime, isOverdue } from '@/lib/utils'
import { Phone, Clock, AlertTriangle, Sparkles } from 'lucide-react'

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
}

export function LeadCard({ lead, highlight = false }: { lead: Lead; highlight?: boolean }) {
  const overdue = isOverdue(lead.sla_deadline)
  const fresh = isNew(lead.created_at)

  return (
    <Link href={`/leads/${lead.id}`} className="block">
      <div className={`relative bg-white rounded-2xl border p-4 card-glow
        ${overdue ? 'border-red-200 bg-red-50/50' : highlight ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'}`}>

        {fresh && (
          <div className="badge-new absolute -top-2 -right-2 flex items-center gap-0.5 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/30 z-10 select-none">
            <Sparkles size={8} />
            NEW
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{lead.name}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <Phone size={10} />
              <span>{lead.phone}</span>
            </div>
          </div>
          <StageBadge stage={lead.main_stage} />
        </div>

        {lead.sub_stage && <p className="text-xs text-slate-400 mb-2 truncate">{lead.sub_stage}</p>}

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{lead.source}</span>
          {lead.preferred_course && (
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full truncate max-w-[120px]">{lead.preferred_course}</span>
          )}
        </div>

        {lead.sla_deadline && (
          <div className={`flex items-center gap-1 mt-2.5 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
            {overdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
            <span>SLA: {formatDateTime(lead.sla_deadline)}</span>
          </div>
        )}
        {lead.next_followup_at && (
          <div className="flex items-center gap-1 mt-1 text-xs text-indigo-600">
            <Clock size={10} />
            <span>Follow-up: {formatDateTime(lead.next_followup_at)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
