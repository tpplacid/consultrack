import type { OrgStage, OrgRole } from './OrgConfigContext'

export const DEFAULT_STAGES: Omit<OrgStage, 'id'>[] = [
  { key: '0', label: 'Lead Gen',              color_bg: 'bg-gray-50',     color_text: 'text-gray-500',   position: 0,  sla_days: null, is_won: false, is_lost: false, substages: [],  required_fields: [] },
  { key: 'A', label: 'Cold/Warm Calling',     color_bg: 'bg-blue-50',     color_text: 'text-blue-600',   position: 1,  sla_days: 1,    is_won: false, is_lost: false, substages: ['DNP-needs-followup','Answered-Interested','Answered-Not-Interested','Answered-Negotiation','Not-Interested-DND','Eligible-for-Next-Year','Unqualified-Lead','Details-Sent'], required_fields: [] },
  { key: 'B', label: 'Follow Up',             color_bg: 'bg-yellow-50',   color_text: 'text-yellow-600', position: 2,  sla_days: 5,    is_won: false, is_lost: false, substages: ['DNP-needs-followup','Answered-Interested','Answered-Not-Interested','Answered-Negotiation','Not-Interested-DND','Unqualified-Lead'], required_fields: ['lead_type', 'location', 'twelfth_score', 'preferred_course', 'interested_colleges'] },
  { key: 'C', label: 'Hot Lead',              color_bg: 'bg-orange-50',   color_text: 'text-orange-600', position: 3,  sla_days: 5,    is_won: false, is_lost: false, substages: ['C1-Contacted-by-Telesales','C2-Contacted-by-Counsellor','C3-Contacted-by-TL','C4-Contacted-by-AD','C5-Already-Purchased-Allotted','C6-Not-Interested-DND'], required_fields: [] },
  { key: 'D', label: 'Admission Application', color_bg: 'bg-purple-50',   color_text: 'text-purple-600', position: 4,  sla_days: 20,   is_won: false, is_lost: false, substages: [], required_fields: [] },
  { key: 'E', label: 'Closed Lost',           color_bg: 'bg-red-50',      color_text: 'text-red-600',    position: 5,  sla_days: null, is_won: false, is_lost: true,  substages: [], required_fields: [] },
  { key: 'F', label: 'Closed Won',            color_bg: 'bg-green-50',    color_text: 'text-green-600',  position: 6,  sla_days: null, is_won: true,  is_lost: false, substages: [], required_fields: [] },
  { key: 'G', label: 'Reporting',             color_bg: 'bg-indigo-50',   color_text: 'text-indigo-600', position: 7,  sla_days: null, is_won: false, is_lost: false, substages: [], required_fields: [] },
  { key: 'X', label: 'Unqualified',           color_bg: 'bg-gray-100',    color_text: 'text-gray-500',   position: 8,  sla_days: null, is_won: false, is_lost: true,  substages: [], required_fields: [] },
  { key: 'Y', label: 'Churn',                 color_bg: 'bg-pink-50',     color_text: 'text-pink-600',   position: 9,  sla_days: null, is_won: false, is_lost: true,  substages: [], required_fields: [] },
]

export const DEFAULT_ROLES: Omit<OrgRole, 'id'>[] = [
  { key: 'telesales',  label: 'Telesales',  level: 1, position: 0, can_view_team: false, can_transfer_leads: false, can_approve_leads: false, can_access_admin: false },
  { key: 'counsellor', label: 'Counsellor', level: 2, position: 1, can_view_team: false, can_transfer_leads: false, can_approve_leads: false, can_access_admin: false },
  { key: 'tl',         label: 'Team Lead',  level: 3, position: 2, can_view_team: true,  can_transfer_leads: true,  can_approve_leads: true,  can_access_admin: false },
  { key: 'ad',         label: 'Admin',      level: 4, position: 3, can_view_team: true,  can_transfer_leads: true,  can_approve_leads: true,  can_access_admin: true  },
]

export const DEFAULT_FLOWS: { from_stage: string; to_stage: string }[] = [
  { from_stage: '0', to_stage: 'A' },
  { from_stage: 'A', to_stage: 'B' },
  { from_stage: 'A', to_stage: 'X' },
  { from_stage: 'B', to_stage: 'C' },
  { from_stage: 'B', to_stage: 'E' },
  { from_stage: 'C', to_stage: 'D' },
  { from_stage: 'C', to_stage: 'E' },
  { from_stage: 'D', to_stage: 'F' },
  { from_stage: 'D', to_stage: 'E' },
  { from_stage: 'F', to_stage: 'G' },
]
