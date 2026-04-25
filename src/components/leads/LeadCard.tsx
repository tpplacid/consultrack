'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { Lead } from '@/types'
import { StageBadge } from './StageBadge'
import { formatDateTime, isOverdue } from '@/lib/utils'
import { Phone, Clock, AlertTriangle, Sparkles, HourglassIcon } from 'lucide-react'

const ONE_MINUTE = 60 * 1000
const ONE_DAY = 24 * 60 * 60 * 1000

export const LeadCard = memo(function LeadCard({
  lead,
  highlight = false,
  pendingApproval = false,
}: {
  lead: Lead
  highlight?: boolean
  pendingApproval?: boolean
}) {
  const overdue = isOverdue(lead.sla_deadline)
  const [tick, setTick] = useState(0)

  const age = Date.now() - new Date(lead.created_at).getTime()
  const isFresh = age < ONE_DAY
  const isAnimated = age < ONE_MINUTE

  useEffect(() => {
    if (!isFresh || !isAnimated) return
    const ms = ONE_MINUTE - age
    const t = setTimeout(() => setTick(n => n + 1), ms > 0 ? ms : 0)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const badgeClass = isAnimated ? 'badge-new' : ''

  const cardBase = pendingApproval
    ? 'border-brand-100 bg-brand-50 opacity-60 pointer-events-none select-none'
    : overdue
    ? 'border-red-200 bg-red-50/50'
    : highlight
    ? 'border-brand-300 bg-brand-50/40'
    : 'border-brand-100'

  return (
    <div className={`relative bg-white rounded-2xl border p-4 card-glow ${cardBase}`}>
      {pendingApproval ? (
        <Link href="#" onClick={e => e.preventDefault()} className="absolute inset-0 rounded-2xl" />
      ) : (
        <Link href={`/leads/${lead.id}`} className="absolute inset-0 rounded-2xl" />
      )}

      {pendingApproval && (
        <div className="absolute -top-2 -right-2 flex items-center gap-0.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow z-10 select-none">
          <HourglassIcon size={8} />
          PENDING
        </div>
      )}

      {!pendingApproval && isFresh && (
        <div className={`${badgeClass} absolute -top-2 -right-2 flex items-center gap-0.5 bg-brand-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-brand-400/30 z-10 select-none`}>
          <Sparkles size={8} />
          NEW
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-brand-900 truncate">{lead.name}</h3>
          <div className="flex items-center gap-1 text-xs text-brand-500 mt-0.5">
            <Phone size={10} />
            <span>{lead.phone}</span>
          </div>
        </div>
        <StageBadge stage={lead.main_stage} />
      </div>

      {lead.sub_stage && <p className="text-xs text-brand-400 mb-2 truncate">{lead.sub_stage}</p>}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full capitalize border border-brand-100">{lead.source}</span>
        {lead.preferred_course && (
          <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full truncate max-w-[120px] border border-brand-100">{lead.preferred_course}</span>
        )}
        {pendingApproval && (
          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Awaiting approval</span>
        )}
      </div>

      {lead.sla_deadline && (
        <div className={`flex items-center gap-1 mt-2.5 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-brand-400'}`}>
          {overdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
          <span>SLA: {formatDateTime(lead.sla_deadline)}</span>
        </div>
      )}
      {lead.next_followup_at && (
        <div className="flex items-center gap-1 mt-1 text-xs text-brand-500">
          <Clock size={10} />
          <span>Follow-up: {formatDateTime(lead.next_followup_at)}</span>
        </div>
      )}
    </div>
  )
})
