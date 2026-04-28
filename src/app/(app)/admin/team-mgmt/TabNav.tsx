'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrgConfig } from '@/context/OrgConfigContext'

const BASE_TABS = [
  { href: '/admin/team-mgmt/employees',  label: 'Employees',        feature: null },
  { href: '/admin/team-mgmt/attendance', label: 'Attendance',       feature: 'attendance' },
  { href: '/admin/team-mgmt/leaves',     label: 'Leave Management', feature: 'attendance' },
  { href: '/admin/team-mgmt/allocation', label: 'Allocation & Org', feature: null },
] as const

export function TeamTabNav() {
  const pathname = usePathname()
  const { features } = useOrgConfig()

  const tabs = BASE_TABS.filter(t => !t.feature || features[t.feature as keyof typeof features])

  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6">
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map(tab => {
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
