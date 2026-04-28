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

// ── Key generation ────────────────────────────────────────────────────────────
export function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}
