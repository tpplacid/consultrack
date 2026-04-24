import { LeadStage, STAGE_LABELS, STAGE_COLORS } from '@/types'
import { cn } from '@/lib/utils'

export function StageBadge({ stage }: { stage: LeadStage | string }) {
  const label = STAGE_LABELS[stage as LeadStage] || stage
  const color = STAGE_COLORS[stage as LeadStage] || 'bg-gray-100 text-gray-700'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold', color)}>
      {stage} — {label}
    </span>
  )
}
