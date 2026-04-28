// Custom lead field system
// ─────────────────────────────────────────────────────────────────────────────
// Each org defines sections; each section has ordered field definitions.
// Field values are stored in leads.custom_data (JSONB) keyed by FieldDef.key.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean'
  | 'phone'
  | 'email'
  | 'url'
  | 'formula'

export interface FieldDef {
  id: string          // stable UUID — never changes after creation
  key: string         // snake_case, unique within org — used as JSONB key
  label: string       // display name shown to counsellors
  type: FieldType
  required: boolean
  placeholder: string
  options: string[]   // ['Option A','Option B'] — only for 'select'
  formula: string     // e.g. "{deposit} + {booking}" — only for 'formula'
  position: number    // sort order within the section
}

export interface SectionLayout {
  id: string
  org_id: string
  section_name: string
  position: number    // sort order across sections
  fields: FieldDef[]
  created_at: string
  updated_at: string
}

// ── Formula evaluator ─────────────────────────────────────────────────────────
// Replaces {key} tokens with numeric values from custom_data, then evaluates
// the resulting arithmetic expression. Only digits and +-*/() are allowed
// after substitution, so there is no arbitrary code execution risk.

export function evaluateFormula(
  formula: string,
  customData: Record<string, unknown>,
): string {
  if (!formula.trim()) return ''
  const expr = formula.replace(/\{(\w+)\}/g, (_, key) => {
    const v = Number(customData[key] ?? 0)
    return isNaN(v) ? '0' : String(v)
  })
  if (!/^[\d\s+\-*/().]+$/.test(expr)) return '⚠ Invalid formula'
  try {
    // eslint-disable-next-line no-new-func
    const result: unknown = new Function('return ' + expr)()
    if (typeof result !== 'number' || !isFinite(result)) return '⚠ Error'
    return String(Math.round(result * 1000) / 1000)
  } catch {
    return '⚠ Error'
  }
}

// ── Built-in column keys ──────────────────────────────────────────────────────
// These keys map to real Postgres columns on the leads table.
// When saving, values for these keys go into column updates; all other keys
// go into leads.custom_data (JSONB).
export const LEAD_COLUMN_KEYS = new Set([
  'lead_type', 'location', 'twelfth_score', 'preferred_course',
  'interested_colleges', 'alternate_courses',
  'father_phone', 'decision_maker', 'income_status', 'loan_status',
  'application_fees', 'booking_fees', 'tuition_fees',
])

// ── Standard sections seeded for orgs with no layouts ────────────────────────
// Section names and field keys match the hardcoded UI exactly so existing
// data continues to be read/written from the same columns.
export const STANDARD_SECTIONS: Omit<SectionLayout, 'id' | 'org_id' | 'created_at' | 'updated_at'>[] = [
  {
    section_name: 'Lead Information',
    position: 0,
    fields: [
      { id: '', key: 'lead_type',          label: 'Lead Type',                      type: 'select',   required: false, placeholder: '', options: ['Engineering','Medical','Management','Commerce','Law','Arts','Other'], formula: '', position: 0 },
      { id: '', key: 'location',           label: 'Location / City',                type: 'text',     required: false, placeholder: 'Chennai', options: [], formula: '', position: 1 },
      { id: '', key: 'twelfth_score',      label: '12th Score (%)',                 type: 'number',   required: false, placeholder: '85', options: [], formula: '', position: 2 },
      { id: '', key: 'preferred_course',   label: 'Preferred Course',               type: 'text',     required: false, placeholder: 'B.Tech CSE', options: [], formula: '', position: 3 },
      { id: '', key: 'interested_colleges',label: 'Interested Colleges (comma-separated, min 1)', type: 'text', required: false, placeholder: 'SRM, VIT, Amrita', options: [], formula: '', position: 4 },
      { id: '', key: 'alternate_courses',  label: 'Alternate Courses (comma-separated)', type: 'text',required: false, placeholder: 'B.Sc Physics, BCA', options: [], formula: '', position: 5 },
    ],
  },
  {
    section_name: 'Parent & Financial',
    position: 1,
    fields: [
      { id: '', key: 'father_phone',    label: 'Father Phone',   type: 'phone',  required: false, placeholder: '+91 9XXXXXXXXX', options: [], formula: '', position: 0 },
      { id: '', key: 'decision_maker',  label: 'Decision Maker', type: 'select', required: false, placeholder: '', options: ['father','mother','sibling','relative'], formula: '', position: 1 },
      { id: '', key: 'income_status',   label: 'Income Status',  type: 'text',   required: false, placeholder: 'e.g. Below 5L', options: [], formula: '', position: 2 },
      { id: '', key: 'loan_status',     label: 'Loan Needed',    type: 'select', required: false, placeholder: '', options: ['yes','no'], formula: '', position: 3 },
    ],
  },
  {
    section_name: 'Payments',
    position: 2,
    fields: [
      { id: '', key: 'application_fees', label: 'Application Fees (₹)', type: 'number',  required: false, placeholder: '0', options: [], formula: '', position: 0 },
      { id: '', key: 'booking_fees',     label: 'Booking Fees (₹)',     type: 'number',  required: false, placeholder: '0', options: [], formula: '', position: 1 },
      { id: '', key: 'tuition_fees',     label: 'Tuition Fees (₹)',     type: 'number',  required: false, placeholder: '0', options: [], formula: '', position: 2 },
      { id: '', key: 'total_collected',  label: 'Total Collected (₹)',  type: 'formula', required: false, placeholder: '', options: [], formula: '{application_fees} + {booking_fees} + {tuition_fees}', position: 3 },
    ],
  },
]

// ── Key generation ────────────────────────────────────────────────────────────
export function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}
