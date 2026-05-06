'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { Lead } from '@/types'
import { StageBadge } from './StageBadge'
import { isOverdue, timeAgo } from '@/lib/utils'
import { getSourceVisual } from '@/lib/leadSourceVisuals'
import { Phone, AlertTriangle, Sparkles, HourglassIcon, Clock } from 'lucide-react'

const ONE_MINUTE = 60 * 1000
const ONE_DAY    = 24 * 60 * 60 * 1000

// Compact two-line layout, mobile-first. Row 1: source dot + name (truncated)
// + stage pill on the right. Row 2: phone (or no-phone marker) + relative time
// + deadline icon if overdue / approaching.
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
  const [, setTick] = useState(0)

  const age = Date.now() - new Date(lead.created_at).getTime()
  const isFresh    = age < ONE_DAY
  const isAnimated = age < ONE_MINUTE

  // Re-render once the "NEW" badge passes its 1 min animation window so
  // the badge stops pulsing without a full refresh.
  useEffect(() => {
    if (!isFresh || !isAnimated) return
    const ms = ONE_MINUTE - age
    const t = setTimeout(() => setTick(n => n + 1), ms > 0 ? ms : 0)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cardBase = pendingApproval
    ? 'border-brand-100 bg-brand-50 opacity-60 pointer-events-none select-none'
    : overdue
      ? 'border-red-200 bg-red-50/50'
      : highlight
        ? 'border-brand-300 bg-brand-50/40'
        : 'border-brand-100'

  const source = getSourceVisual(lead.source)
  const phone  = lead.phone

  return (
    <div className={`relative bg-white rounded-xl border px-3 py-2.5 card-glow ${cardBase}`}>
      {pendingApproval ? (
        <Link href="#" onClick={e => e.preventDefault()} className="absolute inset-0 rounded-xl" />
      ) : (
        <Link href={`/leads/${lead.id}`} className="absolute inset-0 rounded-xl" />
      )}

      {pendingApproval && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow z-10 select-none">
          <HourglassIcon size={8} />
          PENDING
        </div>
      )}

      {!pendingApproval && isFresh && (
        <div className={`${isAnimated ? 'badge-new' : ''} absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-brand-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md shadow-brand-400/30 z-10 select-none`}>
          <Sparkles size={8} />
          NEW
        </div>
      )}

      {/* Row 1: source dot + name + stage pill */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`shrink-0 w-2 h-2 rounded-full ${source.dotClass}`}
          title={source.label}
          aria-label={source.label}
        />
        <h3 className="flex-1 min-w-0 text-sm font-semibold text-brand-900 truncate">{lead.name}</h3>
        <StageBadge stage={lead.main_stage} size="sm" />
      </div>

      {/* Row 2: phone (or empty placeholder) · relative time · deadline marker */}
      <div className="flex items-center gap-2 mt-1 text-[11px] text-brand-500">
        {phone ? (
          <a
            href={`tel:${phone}`}
            onClick={e => e.stopPropagation()}
            className="relative z-10 inline-flex items-center gap-1 hover:text-brand-700 truncate max-w-[55%]"
          >
            <Phone size={10} />
            <span className="truncate">{phone}</span>
          </a>
        ) : (
          <span className="text-brand-300 italic truncate">{source.label}</span>
        )}
        <span className="text-brand-300">·</span>
        <span className="shrink-0">{timeAgo(lead.created_at)}</span>
        {lead.sla_deadline && overdue && (
          <span className="shrink-0 inline-flex items-center gap-0.5 text-red-500 font-medium ml-auto">
            <AlertTriangle size={10} />
            Breached
          </span>
        )}
        {lead.sla_deadline && !overdue && lead.next_followup_at?.slice(0, 10) === new Date().toISOString().slice(0, 10) && (
          <span className="shrink-0 inline-flex items-center gap-0.5 text-amber-600 font-medium ml-auto">
            <Clock size={10} />
            Today
          </span>
        )}
      </div>

      {pendingApproval && (
        <p className="text-[10px] text-amber-700 mt-1">Awaiting approval</p>
      )}
    </div>
  )
})
