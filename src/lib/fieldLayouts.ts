// Custom lead field system
// ─────────────────────────────────────────────────────────────────────────────
// Each org defines sections; each section has ordered field definitions.
// Field values are stored in leads.custom_data (JSONB) keyed by FieldDef.key.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'   // numeric, contributes to revenue aggregations
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
// All lead fields now live in custom_data — no special column treatment.
// Education fields (lead_type, location, etc.) were moved in migration 008.
// Payment fields (application_fees, booking_fees, tuition_fees) were moved in
// migration 011 — orgs now define their own currency fields per their domain.
export const LEAD_COLUMN_KEYS = new Set<string>()

// ── Standard sections — generic CRM starter set ──────────────────────────────
// Auto-seeded the first time an admin visits Settings → Lead Fields if no
// sections exist yet. Modelled on the lowest-common-denominator field set
// across Pipedrive / HubSpot / Zoho / Salesforce so it works for SaaS,
// real-estate, B2B services, education, agencies — anyone running a sales
// pipeline. Admins rename, remove, or add fields freely.
export const STANDARD_SECTIONS: Omit<SectionLayout, 'id' | 'org_id' | 'created_at' | 'updated_at'>[] = [
  {
    section_name: 'Contact',
    position: 0,
    fields: [
      { id: '', key: 'company',   label: 'Company',   type: 'text', required: false, placeholder: 'Acme Inc.',     options: [], formula: '', position: 0 },
      { id: '', key: 'job_title', label: 'Job Title', type: 'text', required: false, placeholder: 'Head of Sales', options: [], formula: '', position: 1 },
      { id: '', key: 'city',      label: 'City',      type: 'text', required: false, placeholder: 'Bengaluru',     options: [], formula: '', position: 2 },
    ],
  },
  {
    section_name: 'Qualification',
    position: 1,
    fields: [
      { id: '', key: 'industry',         label: 'Industry',        type: 'select', required: false, placeholder: '', formula: '', position: 0,
        options: ['SaaS / Software', 'Real Estate', 'Education', 'Healthcare', 'Finance', 'Retail / E-commerce', 'Manufacturing', 'Professional Services', 'Other'] },
      { id: '', key: 'decision_maker',   label: 'Decision Maker',  type: 'select', required: false, placeholder: '', formula: '', position: 1,
        options: ['Decision maker', 'Influencer', 'End user', 'Researcher'] },
      { id: '', key: 'timeline',         label: 'Timeline',        type: 'select', required: false, placeholder: '', formula: '', position: 2,
        options: ['Immediate', 'Within 1 month', '1–3 months', '3–6 months', '6+ months', 'No timeline'] },
    ],
  },
  {
    section_name: 'Deal',
    position: 2,
    fields: [
      { id: '', key: 'deal_value', label: 'Deal Value', type: 'currency', required: false, placeholder: '0', options: [], formula: '', position: 0 },
      { id: '', key: 'notes',      label: 'Notes',      type: 'textarea', required: false, placeholder: 'Requirements, pain points, next steps…', options: [], formula: '', position: 1 },
    ],
  },
]

// ── Revenue field detection ───────────────────────────────────────────────────
// Returns the keys of all currency-typed fields across the given sections.
// Used by analytics, dashboard, CSV exports to compute total revenue per lead
// without hardcoding any specific field names.
export function getRevenueFieldKeys(sections: SectionLayout[]): string[] {
  const keys: string[] = []
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.type === 'currency') keys.push(f.key)
    }
  }
  return keys
}

// Returns label info per revenue key, in section order. Useful for breakdown
// charts where each currency field gets its own bar/column.
export function getRevenueFieldDefs(sections: SectionLayout[]): { key: string; label: string }[] {
  const defs: { key: string; label: string }[] = []
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.type === 'currency') defs.push({ key: f.key, label: f.label })
    }
  }
  return defs
}

// ── Key generation ────────────────────────────────────────────────────────────
export function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}
