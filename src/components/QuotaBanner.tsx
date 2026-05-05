'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, Lock } from 'lucide-react'
import type { QuotaState } from '@/lib/leadQuota'

// Persistent in-app banner for lead-quota warnings.
// Renders nothing for orgs under 80% or with no limit configured.
// Dismiss state is per-threshold and per-day in localStorage so we don't nag
// every page load — but if the threshold rises (80→100), the banner returns.
export function QuotaBanner({ quota }: { quota: QuotaState }) {
  const [hidden, setHidden] = useState(true) // start hidden to avoid SSR/hydration mismatch

  // Decide if banner should show
  const tier =
    quota.limit === null     ? null :
    quota.atLimit            ? 'limit' :
    quota.pct >= 80          ? 'warn' :
    null

  useEffect(() => {
    if (!tier) { setHidden(true); return }
    const today    = new Date().toISOString().slice(0, 10)
    const stamp    = `quota-banner-dismissed:${tier}:${today}`
    setHidden(localStorage.getItem(stamp) === '1')
  }, [tier])

  function dismiss() {
    if (!tier) return
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(`quota-banner-dismissed:${tier}:${today}`, '1')
    setHidden(true)
  }

  if (!tier || hidden) return null

  if (tier === 'limit') {
    return (
      <div className="sticky top-0 z-40 flex items-start gap-3 px-4 py-3 border-b border-red-300 bg-red-50">
        <Lock size={16} className="text-red-700 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-900">
            Lead limit reached ({quota.count.toLocaleString('en-IN')} / {quota.limit?.toLocaleString('en-IN')})
          </p>
          <p className="text-xs text-red-800 mt-0.5">
            New lead creation is {quota.enforced ? 'blocked' : 'still allowed (enforcement off)'}.{' '}
            <Link href="/admin/settings/plan" className="underline font-semibold hover:text-red-950">Export & reset</Link> or contact support to raise your plan.
          </p>
        </div>
        <button onClick={dismiss} className="text-red-700 hover:text-red-900 p-1 flex-shrink-0" title="Dismiss for today">
          <X size={14} />
        </button>
      </div>
    )
  }

  // tier === 'warn'
  return (
    <div className="sticky top-0 z-40 flex items-start gap-3 px-4 py-3 border-b border-amber-300 bg-amber-50">
      <AlertTriangle size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          {quota.pct}% of your plan used ({quota.count.toLocaleString('en-IN')} / {quota.limit?.toLocaleString('en-IN')} leads)
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          Approaching your ceiling. <Link href="/admin/settings/plan" className="underline font-semibold hover:text-amber-950">Manage plan</Link> to upgrade or export & reset.
        </p>
      </div>
      <button onClick={dismiss} className="text-amber-700 hover:text-amber-900 p-1 flex-shrink-0" title="Dismiss for today">
        <X size={14} />
      </button>
    </div>
  )
}
