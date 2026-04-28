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

export function buildWAUrl(phone: string, body: string): string {
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
