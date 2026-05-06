'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Layers, ListFilter, GitBranch, Clock, LayoutDashboard,
  Radio, Upload, Shield, MessageSquare, Lock, Gauge, Instagram,
} from 'lucide-react'
import { useOrgConfig, OrgFeatures } from '@/context/OrgConfigContext'
import { UpgradeModal } from '@/components/UpgradeModal'

interface NavItem {
  href:         string
  label:        string
  icon:         React.ElementType
  feature?:     keyof OrgFeatures
  featureKey?:  string
  upgradeLabel?: string
  upgradeDesc?:  string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Pipeline',
    items: [
      { href: '/admin/settings/layouts',        label: 'Lead Fields', icon: Layers },
      { href: '/admin/settings/dashboard',      label: 'Dashboard',   icon: LayoutDashboard },
      { href: '/admin/settings/sources',        label: 'Sources',     icon: ListFilter },
      {
        href: '/admin/settings/pipeline',       label: 'Stages',      icon: GitBranch,
        feature: 'pipeline', featureKey: 'pipeline',
        upgradeLabel: 'Pipeline Customisation',
        upgradeDesc:  'Model your exact sales process — every stage, sub-stage, and transition rule.',
      },
      {
        href: '/admin/settings/sla-thresholds', label: 'Deadlines',   icon: Clock,
        feature: 'sla', featureKey: 'sla',
        upgradeLabel: 'Deadline Rules (SLA)',
        upgradeDesc:  'Set custom deadline windows per pipeline stage. Breach alerts keep your team accountable and on schedule.',
      },
    ],
  },
  {
    title: 'Integrations',
    items: [
      {
        href: '/admin/settings/meta',         label: 'Facebook Ads',    icon: Radio,
        feature: 'meta', featureKey: 'meta',
        upgradeLabel: 'Facebook Lead Integration',
        upgradeDesc:  'Automatically pull leads from your Facebook Lead Ads campaigns directly into the pipeline.',
      },
      {
        href: '/admin/settings/instagram',    label: 'Instagram Ads',   icon: Instagram,
        feature: 'instagram', featureKey: 'instagram',
        upgradeLabel: 'Instagram Lead Integration',
        upgradeDesc:  'Automatically pull leads from your Instagram Lead Ads directly into the pipeline — bifurcated from Facebook.',
      },
      {
        href: '/admin/settings/bulk-upload',  label: 'Import Leads',    icon: Upload,
        feature: 'bulk_upload', featureKey: 'bulk_upload',
        upgradeLabel: 'Bulk CSV Import',
        upgradeDesc:  'Import hundreds of leads at once from a CSV file — map columns, validate data, and push straight into your pipeline.',
      },
    ],
  },
  {
    title: 'Team',
    items: [
      {
        href: '/admin/settings/roles',      label: 'Roles',    icon: Shield,
        feature: 'roles', featureKey: 'roles',
        upgradeLabel: 'Role Management',
        upgradeDesc:  'Define custom roles with granular access permissions — control who can view teams, transfer leads, and access admin areas.',
      },
      {
        href: '/admin/settings/templates',  label: 'Messages', icon: MessageSquare,
        feature: 'lead_crm', featureKey: 'lead_crm',
        upgradeLabel: 'WhatsApp Templates',
        upgradeDesc:  'Manage reusable WhatsApp message templates for consistent lead communication.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/admin/settings/plan', label: 'Plan & Data', icon: Gauge },
    ],
  },
]

export function SettingsTabNav() {
  const pathname  = usePathname()
  const { features } = useOrgConfig()
  const [upgradeItem, setUpgradeItem] = useState<NavItem | null>(null)

  return (
    <>
      {/* ── Mobile: section dropdown (collapsed groups) ── */}
      <div className="md:hidden border-b border-slate-200 bg-white px-3 py-2">
        <select
          value={pathname}
          onChange={e => {
            const href = e.target.value
            // Find the item to check if locked
            for (const g of NAV_GROUPS) {
              const it = g.items.find(i => i.href === href)
              if (it) {
                if (it.feature && !features[it.feature]) {
                  setUpgradeItem(it)
                  return
                }
                window.location.href = href
                return
              }
            }
          }}
          className="w-full px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {NAV_GROUPS.map(g => (
            <optgroup key={g.title} label={g.title}>
              {g.items.map(it => {
                const isLocked = !!(it.feature && !features[it.feature])
                return (
                  <option key={it.href} value={it.href}>
                    {it.label}{isLocked ? ' 🔒' : ''}
                  </option>
                )
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {/* ── Desktop: sidebar ── */}
      <nav className="hidden md:block w-48 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto py-4">
        {NAV_GROUPS.map((group, gi) => {
          const enabled  = group.items.filter(it => !it.feature || features[it.feature])
          const locked   = group.items.filter(it =>  it.feature && !features[it.feature])
          const allItems = [...enabled, ...locked]

          return (
            <div key={group.title} className={gi > 0 ? 'mt-5' : ''}>
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>
              {allItems.map(item => {
                const isLocked = !!(item.feature && !features[item.feature])
                const active   = pathname.startsWith(item.href)
                const Icon     = item.icon

                if (isLocked) {
                  return (
                    <button
                      key={item.featureKey}
                      onClick={() => setUpgradeItem(item)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Icon size={14} className="flex-shrink-0 text-amber-400" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      <Lock size={10} className="flex-shrink-0 text-amber-400" />
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-400'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={14} className={`flex-shrink-0 ${active ? 'text-brand-500' : 'text-slate-400'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {upgradeItem && (
        <UpgradeModal
          featureLabel={upgradeItem.upgradeLabel || upgradeItem.label}
          featureKey={upgradeItem.featureKey!}
          description={upgradeItem.upgradeDesc!}
          onClose={() => setUpgradeItem(null)}
        />
      )}
    </>
  )
}
