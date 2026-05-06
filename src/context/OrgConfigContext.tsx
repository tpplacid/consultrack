'use client'

import { createContext, useContext } from 'react'

export interface OrgStage {
  id: string
  key: string
  label: string
  color_bg: string
  color_text: string
  position: number
  sla_days: number | null
  is_won: boolean
  is_lost: boolean
  substages: string[]
  required_fields: string[]
}

export interface OrgRole {
  id: string
  key: string
  label: string
  level: number
  can_view_team: boolean
  can_transfer_leads: boolean
  can_approve_leads: boolean
  can_access_admin: boolean
  position: number
}

export interface OrgFeatures {
  lead_crm:    boolean
  sla:         boolean
  pipeline:    boolean
  roles:       boolean
  attendance:  boolean
  meta:        boolean
  instagram:   boolean
  bulk_upload: boolean
}

export const DEFAULT_FEATURES: OrgFeatures = {
  lead_crm:    true,
  sla:         true,
  pipeline:    true,
  roles:       true,
  attendance:  true,
  meta:        true,
  instagram:   false,
  bulk_upload: true,
}

export interface LeadSource {
  key: string
  label: string
  sla_excluded: boolean
}

export const DEFAULT_LEAD_SOURCES: LeadSource[] = [
  { key: 'meta',      label: 'Facebook Ads', sla_excluded: false },
  { key: 'instagram', label: 'Instagram Ads', sla_excluded: false },
  { key: 'offline',   label: 'Offline',       sla_excluded: true  },
  { key: 'referral',  label: 'Referral',      sla_excluded: true  },
]

interface OrgConfig {
  stages: OrgStage[]
  roles: OrgRole[]
  stageMap: Record<string, OrgStage>
  roleMap: Record<string, OrgRole>
  features: OrgFeatures
  leadSources: LeadSource[]
}

const OrgConfigContext = createContext<OrgConfig>({
  stages: [],
  roles: [],
  stageMap: {},
  roleMap: {},
  features: DEFAULT_FEATURES,
  leadSources: DEFAULT_LEAD_SOURCES,
})

export function OrgConfigProvider({ children, config }: { children: React.ReactNode; config: OrgConfig }) {
  return <OrgConfigContext.Provider value={config}>{children}</OrgConfigContext.Provider>
}

export function useOrgConfig() {
  return useContext(OrgConfigContext)
}

export { DEFAULT_STAGES, DEFAULT_ROLES, DEFAULT_FLOWS } from './orgDefaults'
