'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/sla-mgmt/thresholds', label: 'Deadline Thresholds' },
  { href: '/admin/sla-mgmt/log', label: 'Breach Log' },
]

export function SlaTabNav() {
  const pathname = usePathname()
  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6">
      <div className="flex items-center gap-1 overflow-x-auto">
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
    </div>
  )
}
