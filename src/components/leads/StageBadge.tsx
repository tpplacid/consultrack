'use client'

import { useOrgConfig } from '@/context/OrgConfigContext'
import { cn } from '@/lib/utils'

export function StageBadge({ stage, size = 'md' }: { stage: string; size?: 'sm' | 'md' }) {
  const { stageMap } = useOrgConfig()
  const s = stageMap[stage]
  const label = s?.label ?? stage
  const color = s ? `${s.color_bg} ${s.color_text}` : 'bg-gray-100 text-gray-700'
  const sizeClass = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'   // dense list rows
    : 'text-xs   px-2   py-0.5'     // default
  return (
    <span className={cn('inline-flex items-center rounded-md font-semibold', sizeClass, color)}>
      {label}
    </span>
  )
}
