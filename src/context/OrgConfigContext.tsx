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

interface OrgConfig {
  stages: OrgStage[]
  roles: OrgRole[]
  stageMap: Record<string, OrgStage>
  roleMap: Record<string, OrgRole>
}

const OrgConfigContext = createContext<OrgConfig>({
  stages: [],
  roles: [],
  stageMap: {},
  roleMap: {},
})

export function OrgConfigProvider({ children, config }: { children: React.ReactNode; config: OrgConfig }) {
  return <OrgConfigContext.Provider value={config}>{children}</OrgConfigContext.Provider>
}

export function useOrgConfig() {
  return useContext(OrgConfigContext)
}

export { DEFAULT_STAGES, DEFAULT_ROLES, DEFAULT_FLOWS } from './orgDefaults'
