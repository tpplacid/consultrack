export type EmployeeRole = 'telesales' | 'counsellor' | 'tl' | 'ad'
export type LeadSource = string
export type LeadStage = '0' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'X' | 'Y'
export type ActivityType =
  | 'stage_change' | 'comment' | 'field_update' | 'call_log' | 'whatsapp_sent' | 'lead_created'
  | 'ig_dm_received' | 'ig_comment_received' | 'ig_mention_received'
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'questioned' | 'rejected'
export type LeaveType = 'sick' | 'casual' | 'emergency'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type SlaResolution = 'closed' | 'explanation_requested' | 'pending'
export type DecisionMaker = 'father' | 'mother' | 'sibling' | 'relative'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Org {
  id: string
  name: string
  slug: string
  require_attendance_key: boolean
  created_at: string
}

export interface Employee {
  id: string
  org_id: string
  email: string
  name: string
  role: EmployeeRole
  reports_to: string | null
  score: number
  is_active: boolean
  is_on_leave: boolean
  wifi_ssid: string | null
  auto_allocate?: boolean
  created_at: string
  // joined relations
  manager?: Employee
}

export interface Lead {
  id: string
  org_id: string
  name: string
  phone: string
  source: LeadSource
  main_stage: LeadStage
  sub_stage: string | null
  owner_id: string | null
  reporting_manager_id: string | null
  stage_entered_at: string
  sla_deadline: string | null
  next_followup_at: string | null
  approved: boolean
  approved_by: string | null
  meta_lead_id: string | null
  // Revenue fields (application_fees, booking_fees, tuition_fees) were moved
  // into custom_data in migration 011. Use leadRevenue(lead, revenueKeys) from
  // src/lib/utils.ts to compute totals — never read these directly any more.
  custom_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // joined
  owner?: Employee
  reporting_manager?: Employee
}

export interface Activity {
  id: string
  org_id: string
  lead_id: string
  employee_id: string
  activity_type: ActivityType
  note: string | null
  stage_from: string | null
  stage_to: string | null
  created_at: string
  employee?: Employee
}

export interface Attendance {
  id: string
  org_id: string
  employee_id: string
  work_date: string
  clock_in: string | null
  clock_out: string | null
  wifi_verified: boolean
  manual_override: boolean
  override_reason: string | null
  override_approved_by: string | null
  status: AttendanceStatus
  admin_note: string | null
  created_at: string
  employee?: Employee
}

export interface Leave {
  id: string
  org_id: string
  employee_id: string
  leave_date: string
  leave_type: LeaveType
  status: LeaveStatus
  approved_by: string | null
  reason: string | null
  created_at: string
  employee?: Employee
}

export interface Weekoff {
  id: string
  org_id: string
  employee_id: string
  day_of_week: string | null
  specific_date: string | null
  created_by: string | null
}

export interface SlaBreach {
  id: string
  org_id: string
  lead_id: string
  owner_id: string
  stage: string
  breached_at: string
  resolution: SlaResolution
  resolved_by: string | null
  explanation: string | null
  explanation_status: 'pending' | 'resolved' | null
  created_at: string
  lead?: Lead
  owner?: Employee
}

export interface WaTemplate {
  id: string
  org_id: string
  name: string
  body: string
  created_by: string | null
  is_active: boolean
  created_at: string
}

export interface OfflineLeadApproval {
  id: string
  org_id: string
  lead_id: string
  submitted_by: string
  approver_id: string
  status: ApprovalStatus
  created_at: string
  lead?: Lead
  submitter?: Employee
  approver?: Employee
}

// Stage config
// SLA deadline in days per stage (null = no SLA). Referral/offline leads are excluded from breach.
export const STAGE_SLA_DAYS: Partial<Record<LeadStage, number>> = {
  'A': 1,
  'B': 5,
  'C': 5,
  'D': 20,
}

export const SLA_EXCLUDED_SOURCES = ['referral', 'offline']

export const STAGE_LABELS: Record<LeadStage, string> = {
  '0': 'Lead Gen',
  'A': 'Cold/Warm Calling',
  'B': 'Follow Up',
  'C': 'Hot Lead',
  'D': 'Admission Application',
  'E': 'Closed Lost',
  'F': 'Closed Won',
  'G': 'Reporting',
  'X': 'Unqualified',
  'Y': 'Churn',
}

export const STAGE_COLORS: Record<LeadStage, string> = {
  '0': 'bg-gray-50 text-gray-500',
  'A': 'bg-blue-50 text-blue-600',
  'B': 'bg-yellow-50 text-yellow-600',
  'C': 'bg-orange-50 text-orange-600',
  'D': 'bg-purple-50 text-purple-600',
  'E': 'bg-red-50 text-red-600',
  'F': 'bg-green-50 text-green-600',
  'G': 'bg-indigo-50 text-indigo-600',
  'X': 'bg-gray-100 text-gray-500',
  'Y': 'bg-pink-50 text-pink-600',
}

export const SUB_STAGES: Record<string, string[]> = {
  'A': [
    'DNP-needs-followup',
    'Answered-Interested',
    'Answered-Not-Interested',
    'Answered-Negotiation',
    'Not-Interested-DND',
    'Eligible-for-Next-Year',
    'Unqualified-Lead',
    'Details-Sent',
  ],
  'B': [
    'DNP-needs-followup',
    'Answered-Interested',
    'Answered-Not-Interested',
    'Answered-Negotiation',
    'Not-Interested-DND',
    'Unqualified-Lead',
  ],
  'C': [
    'C1-Contacted-by-Telesales',
    'C2-Contacted-by-Counsellor',
    'C3-Contacted-by-TL',
    'C4-Contacted-by-AD',
    'C5-Already-Purchased-Allotted',
    'C6-Not-Interested-DND',
  ],
}

export const SLA_DAYS: Partial<Record<LeadStage, number>> = {
  'A': 1,
  'B': 5,
  'C': 5,
  'D': 20,
}

// Fields required to move from A → B
export const STAGE_A_TO_B_REQUIRED = [
  'lead_type',
  'location',
  'twelfth_score',
  'preferred_course',
] as const

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  telesales: 'Telesales',
  counsellor: 'Counsellor',
  tl: 'TL',
  ad: 'AD',
}

export function formatRole(role: EmployeeRole): string {
  return ROLE_LABELS[role]
}
