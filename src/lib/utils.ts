import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false
  return isPast(new Date(date))
}

export function encodeWAText(text: string): string {
  return encodeURIComponent(text)
}

export function buildWAUrl(phone: string | null | undefined, body: string): string {
  if (!phone) return '#'
  let clean = phone.replace(/\D/g, '')

  // Normalise to full international format — wa.me requires this on mobile.
  // WhatsApp Web is lenient; the app is strict and shows "link couldn't be opened"
  // when the country code is missing.
  if (clean.length === 10 && /^[6-9]/.test(clean)) {
    // 10-digit Indian mobile (6xx–9xx) → prepend 91
    clean = '91' + clean
  } else if (clean.length === 11 && clean.startsWith('0')) {
    // Leading-zero format (011-digit) → strip 0, prepend 91
    clean = '91' + clean.slice(1)
  }
  // 12-digit (already has 91) or other country codes — use as-is

  const text = body ? `?text=${encodeWAText(body)}` : ''
  return `https://wa.me/${clean}${text}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Read a lead field value — checks custom_data first (new leads), then falls
 * back to the direct column (old leads pre-migration). Always returns a string.
 * Arrays (e.g. interested_colleges column) are joined with ", ".
 */
export function lf(lead: unknown, key: string): string {
  const l = lead as Record<string, unknown>
  const cd = (l.custom_data ?? {}) as Record<string, unknown>
  const cdVal = cd[key]
  if (cdVal !== undefined && cdVal !== null && cdVal !== '') return String(cdVal)
  const colVal = l[key]
  if (colVal === null || colVal === undefined) return ''
  if (Array.isArray(colVal)) return colVal.join(', ')
  return String(colVal)
}

/**
 * Numeric variant of lf() — for currency/number fields.
 * Returns 0 (not NaN) when the value is missing or non-numeric so it's safe
 * to use directly inside reduce/sum/Math operations.
 */
export function lfn(lead: unknown, key: string): number {
  const l = lead as Record<string, unknown>
  const cd = (l.custom_data ?? {}) as Record<string, unknown>
  const raw = cd[key] !== undefined && cd[key] !== null && cd[key] !== '' ? cd[key] : l[key]
  if (raw === null || raw === undefined || raw === '') return 0
  const n = Number(raw)
  return isFinite(n) ? n : 0
}

/**
 * Sum the values of every revenue (currency-typed) field on a lead.
 * `revenueKeys` comes from getRevenueFieldKeys(sections) — pass [] when sections
 * are unknown to get 0 (safe default, never throws).
 */
export function leadRevenue(lead: unknown, revenueKeys: string[]): number {
  let total = 0
  for (const k of revenueKeys) total += lfn(lead, k)
  return total
}
