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
  lead_crm:    boolean // Dashboard, leads, pipeline management
  sla:         boolean // Deadline breach tracking
  pipeline:    boolean // Pipeline stage customisation
  roles:       boolean // Role management
  attendance:  boolean // Attendance & leave management
  meta:        boolean // Meta / Facebook lead integration
  bulk_upload: boolean // Bulk CSV lead import
}

export const DEFAULT_FEATURES: OrgFeatures = {
  lead_crm:    true,
  sla:         true,
  pipeline:    true,
  roles:       true,
  attendance:  true,
  meta:        true,
  bulk_upload: true,
}

interface OrgConfig {
  stages: OrgStage[]
  roles: OrgRole[]
  stageMap: Record<string, OrgStage>
  roleMap: Record<string, OrgRole>
  features: OrgFeatures
}

const OrgConfigContext = createContext<OrgConfig>({
  stages: [],
  roles: [],
  stageMap: {},
  roleMap: {},
  features: DEFAULT_FEATURES,
})

export function OrgConfigProvider({ children, config }: { children: React.ReactNode; config: OrgConfig }) {
  return <OrgConfigContext.Provider value={config}>{children}</OrgConfigContext.Provider>
}

export function useOrgConfig() {
  return useContext(OrgConfigContext)
}

export { DEFAULT_STAGES, DEFAULT_ROLES, DEFAULT_FLOWS } from './orgDefaults'
