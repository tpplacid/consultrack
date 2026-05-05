'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings2 } from 'lucide-react'

// Operational SLA view has only one tab now (Breach Log).
// "Configure Thresholds" is a CROSS-LINK into Settings rather than a
// duplicate route so we don't end up maintaining two threshold editors.
const TABS = [
  { href: '/admin/sla-mgmt/log', label: 'Breach Log' },
]

export function SlaTabNav() {
  const pathname = usePathname()
  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const active = pathname.startsWith(tab.href)
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex-shrink-0 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >{tab.label}</Link>
            )
          })}
        </div>
        <Link
          href="/admin/settings/sla-thresholds"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 my-2 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Settings2 size={12} />
          Configure thresholds
        </Link>
      </div>
    </div>
  )
}
