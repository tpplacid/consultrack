'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { useOrgConfig, OrgFeatures } from '@/context/OrgConfigContext'
import { UpgradeModal } from '@/components/UpgradeModal'

interface Tab {
  href: string
  label: string
  feature?: keyof OrgFeatures
  featureKey?: string
  upgradeLabel?: string
  upgradeDesc?: string
}

const TABS: Tab[] = [
  {
    href: '/admin/settings/layouts',
    label: 'Lead Fields',
  },
  {
    href: '/admin/settings/pipeline',
    label: 'Pipeline',
    feature: 'pipeline',
    featureKey: 'pipeline',
    upgradeLabel: 'Pipeline Customisation',
    upgradeDesc: 'Model your exact sales process — every stage, sub-stage, and transition rule.',
  },
  {
    href: '/admin/settings/roles',
    label: 'Roles',
    feature: 'roles',
    featureKey: 'roles',
    upgradeLabel: 'Role Management',
    upgradeDesc: 'Define custom roles with granular access permissions — control who can view teams, transfer leads, and access admin areas.',
  },
  {
    href: '/admin/settings/templates',
    label: 'WA Templates',
    feature: 'lead_crm',
    featureKey: 'lead_crm',
    upgradeLabel: 'WhatsApp Templates',
    upgradeDesc: 'Manage reusable WhatsApp message templates for consistent lead communication.',
  },
  {
    href: '/admin/settings/meta',
    label: 'Meta Leads',
    feature: 'meta',
    featureKey: 'meta',
    upgradeLabel: 'Meta Integration',
    upgradeDesc: 'Automatically pull leads from your Meta (Facebook & Instagram) ad campaigns directly into the pipeline — no manual entry.',
  },
  {
    href: '/admin/settings/bulk-upload',
    label: 'Bulk Upload',
    feature: 'bulk_upload',
    featureKey: 'bulk_upload',
    upgradeLabel: 'Bulk CSV Upload',
    upgradeDesc: 'Import hundreds of leads at once from a CSV file — map columns, validate data, and push straight into your pipeline.',
  },
  {
    href: '/admin/settings/sla-thresholds',
    label: 'SLA Thresholds',
    feature: 'sla',
    featureKey: 'sla',
    upgradeLabel: 'Deadline Rules (SLA)',
    upgradeDesc: 'Set custom deadline windows per pipeline stage. Breach alerts keep your team accountable and on schedule.',
  },
]

export function SettingsTabNav() {
  const pathname = usePathname()
  const { features } = useOrgConfig()
  const [upgradeTab, setUpgradeTab] = useState<Tab | null>(null)

  const enabledTabs = TABS.filter(t => !t.feature || features[t.feature])
  const disabledTabs = TABS.filter(t => t.feature && !features[t.feature])

  // Deduplicate disabled tabs (lead_crm may appear twice)
  const seen = new Set<string>()
  const uniqueDisabledTabs = disabledTabs.filter(t => {
    const k = t.featureKey!
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return (
    <>
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <div className="flex items-center gap-0 overflow-x-auto">

          {/* Enabled tabs */}
          {enabledTabs.map(tab => {
            const active = pathname.startsWith(tab.href)
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex-shrink-0 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-brand-400 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}

          {/* Divider */}
          {uniqueDisabledTabs.length > 0 && enabledTabs.length > 0 && (
            <div className="flex-shrink-0 w-px h-5 bg-slate-200 mx-2 self-center" />
          )}

          {/* Locked tabs — gold gradient, fully clickable */}
          {uniqueDisabledTabs.map(tab => (
            <button
              key={tab.featureKey}
              onClick={() => setUpgradeTab(tab)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 border-amber-400 bg-gradient-to-b from-amber-50 to-transparent text-amber-700 hover:from-amber-100 hover:text-amber-800 transition-colors cursor-pointer"
            >
              <Lock size={11} className="text-amber-500 flex-shrink-0" />
              {tab.upgradeLabel || tab.label}
            </button>
          ))}
        </div>
      </div>

      {upgradeTab && (
        <UpgradeModal
          featureLabel={upgradeTab.upgradeLabel || upgradeTab.label}
          featureKey={upgradeTab.featureKey!}
          description={upgradeTab.upgradeDesc!}
          onClose={() => setUpgradeTab(null)}
        />
      )}
    </>
  )
}
