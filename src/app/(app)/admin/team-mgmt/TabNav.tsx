'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useOrgConfig } from '@/context/OrgConfigContext'
import { UpgradeModal } from '@/components/UpgradeModal'

const TABS = [
  { href: '/admin/team-mgmt/employees',  label: 'Employees',        feature: null        as string | null },
  { href: '/admin/team-mgmt/attendance', label: 'Attendance',       feature: 'attendance' as string | null,
    upgradeLabel: 'Attendance', upgradeDesc: 'Track employee clock-in/out, manage leave requests, and configure weekoffs for your team.' },
  { href: '/admin/team-mgmt/leaves',     label: 'Leave Management', feature: 'attendance' as string | null,
    upgradeLabel: 'Leave Management', upgradeDesc: 'Track employee clock-in/out, manage leave requests, and configure weekoffs for your team.' },
  { href: '/admin/team-mgmt/allocation', label: 'Allocation & Org', feature: null        as string | null },
]

export function TeamTabNav() {
  const pathname = usePathname()
  const { features } = useOrgConfig()
  const [lockedTab, setLockedTab] = useState<typeof TABS[number] | null>(null)

  return (
    <>
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const locked = !!(tab.feature && !features[tab.feature as keyof typeof features])
            const active  = pathname.startsWith(tab.href)

            if (locked) {
              return (
                <button key={tab.href}
                  onClick={() => setLockedTab(tab)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 border-amber-400 bg-gradient-to-b from-amber-50 to-transparent text-amber-700 hover:from-amber-100 hover:text-amber-800 transition-colors"
                >
                  <Lock size={11} className="text-amber-500 flex-shrink-0" />
                  {tab.label}
                </button>
              )
            }

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

      {lockedTab && (
        <UpgradeModal
          featureKey={lockedTab.feature!}
          featureLabel={lockedTab.upgradeLabel ?? lockedTab.label}
          description={lockedTab.upgradeDesc ?? ''}
          onClose={() => setLockedTab(null)}
        />
      )}
    </>
  )
}
