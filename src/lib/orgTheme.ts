// Per-org brand palette presets.
// Each palette overrides the CSS custom properties used in @theme.
// Custom hex colours are also supported — getPalette() auto-derives all
// shade variants from the primary hex so orgs aren't limited to presets.

export interface Palette {
  key: string
  label: string
  /** Hex colour used for the swatch preview */
  swatch: string
  css: {
    '--color-brand-50': string
    '--color-brand-100': string
    '--color-brand-200': string
    '--color-brand-300': string
    '--color-brand-400': string
    '--color-brand-500': string
    '--color-brand-600': string
    '--color-brand-700': string
    '--color-brand-800': string
    '--color-brand-900': string
  }
}

export const PALETTES: Palette[] = [
  // Default brand palette — matches the Consultrack mark + SA --sa-accent
  // (#4f46e5). Listed first so it's the first swatch in the SA picker.
  {
    key: 'indigo',
    label: 'Consultrack',
    swatch: '#4f46e5',
    css: {
      '--color-brand-50':  '#eef2ff',
      '--color-brand-100': '#e0e7ff',
      '--color-brand-200': '#c7d2fe',
      '--color-brand-300': '#a5b4fc',
      '--color-brand-400': '#4f46e5',
      '--color-brand-500': '#4338ca',
      '--color-brand-600': '#3730a3',
      '--color-brand-700': '#312e81',
      '--color-brand-800': '#2e2b72',
      '--color-brand-900': '#1e1b4b',
    },
  },
  {
    key: 'teal',
    label: 'Teal',
    swatch: '#3d9191',
    css: {
      '--color-brand-50':  '#e6f4f4',
      '--color-brand-100': '#b2d8d8',
      '--color-brand-200': '#88b8b8',
      '--color-brand-300': '#5c9c9c',
      '--color-brand-400': '#3d9191',
      '--color-brand-500': '#2a7070',
      '--color-brand-600': '#236868',
      '--color-brand-700': '#1e5c5c',
      '--color-brand-800': '#1a4a50',
      '--color-brand-900': '#123438',
    },
  },
  {
    key: 'blue',
    label: 'Blue',
    swatch: '#2563eb',
    css: {
      '--color-brand-50':  '#eff6ff',
      '--color-brand-100': '#dbeafe',
      '--color-brand-200': '#bfdbfe',
      '--color-brand-300': '#93c5fd',
      '--color-brand-400': '#2563eb',
      '--color-brand-500': '#1d4ed8',
      '--color-brand-600': '#1e40af',
      '--color-brand-700': '#1e3a8a',
      '--color-brand-800': '#1e3a7a',
      '--color-brand-900': '#172554',
    },
  },
  {
    key: 'green',
    label: 'Green',
    swatch: '#16a34a',
    css: {
      '--color-brand-50':  '#f0fdf4',
      '--color-brand-100': '#dcfce7',
      '--color-brand-200': '#bbf7d0',
      '--color-brand-300': '#86efac',
      '--color-brand-400': '#16a34a',
      '--color-brand-500': '#15803d',
      '--color-brand-600': '#166534',
      '--color-brand-700': '#14532d',
      '--color-brand-800': '#14532d',
      '--color-brand-900': '#052e16',
    },
  },
  {
    key: 'rose',
    label: 'Rose',
    swatch: '#e11d48',
    css: {
      '--color-brand-50':  '#fff1f2',
      '--color-brand-100': '#ffe4e6',
      '--color-brand-200': '#fecdd3',
      '--color-brand-300': '#fda4af',
      '--color-brand-400': '#e11d48',
      '--color-brand-500': '#be123c',
      '--color-brand-600': '#9f1239',
      '--color-brand-700': '#881337',
      '--color-brand-800': '#7a1132',
      '--color-brand-900': '#4c0519',
    },
  },
  {
    key: 'amber',
    label: 'Amber',
    swatch: '#d97706',
    css: {
      '--color-brand-50':  '#fffbeb',
      '--color-brand-100': '#fef3c7',
      '--color-brand-200': '#fde68a',
      '--color-brand-300': '#fcd34d',
      '--color-brand-400': '#d97706',
      '--color-brand-500': '#b45309',
      '--color-brand-600': '#92400e',
      '--color-brand-700': '#78350f',
      '--color-brand-800': '#6b2e0c',
      '--color-brand-900': '#451a03',
    },
  },
  {
    key: 'purple',
    label: 'Purple',
    swatch: '#9333ea',
    css: {
      '--color-brand-50':  '#faf5ff',
      '--color-brand-100': '#f3e8ff',
      '--color-brand-200': '#e9d5ff',
      '--color-brand-300': '#d8b4fe',
      '--color-brand-400': '#9333ea',
      '--color-brand-500': '#7e22ce',
      '--color-brand-600': '#6b21a8',
      '--color-brand-700': '#581c87',
      '--color-brand-800': '#4a1878',
      '--color-brand-900': '#3b0764',
    },
  },
  {
    key: 'slate',
    label: 'Slate',
    swatch: '#475569',
    css: {
      '--color-brand-50':  '#f8fafc',
      '--color-brand-100': '#f1f5f9',
      '--color-brand-200': '#e2e8f0',
      '--color-brand-300': '#94a3b8',
      '--color-brand-400': '#475569',
      '--color-brand-500': '#334155',
      '--color-brand-600': '#1e293b',
      '--color-brand-700': '#0f172a',
      '--color-brand-800': '#0a1020',
      '--color-brand-900': '#060912',
    },
  },
]

// Default palette for new orgs — Consultrack indigo. Existing orgs that
// previously had no brand_palette stored will also pick this up.
export const DEFAULT_PALETTE = 'indigo'

// ── Custom colour support ──────────────────────────────────────────────────
// When brand_palette is a hex string (e.g. "#c0392b") instead of a key,
// we derive all 10 shade variants algorithmically from the primary hue.

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l   = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else                h = ((r - g) / d + 4) / 6
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k     = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generatePaletteFromHex(primaryHex: string): Palette['css'] {
  const [h, s, l] = hexToHsl(primaryHex)
  // Light shades — tinted, progressively lighter
  const l50  = 96
  const l100 = 90
  const l200 = 80
  const l300 = 67
  // Dark shades — sidebar-suitable: brand-800 is always ≤ 22% lightness
  const l500 = Math.max(l - 8,  5)
  const l600 = Math.max(l - 16, 4)
  const l700 = Math.min(Math.max(l * 0.45, 3), 24)
  const l800 = Math.min(Math.max(l * 0.30, 2), 20)
  const l900 = Math.min(Math.max(l * 0.18, 2), 14)
  const sDark = Math.min(s + 8, 90)
  return {
    '--color-brand-50':  hslToHex(h, Math.max(s * 0.2, 8),  l50),
    '--color-brand-100': hslToHex(h, Math.max(s * 0.35, 12), l100),
    '--color-brand-200': hslToHex(h, Math.max(s * 0.55, 20), l200),
    '--color-brand-300': hslToHex(h, Math.max(s * 0.75, 30), l300),
    '--color-brand-400': primaryHex,
    '--color-brand-500': hslToHex(h, sDark, l500),
    '--color-brand-600': hslToHex(h, sDark, l600),
    '--color-brand-700': hslToHex(h, sDark, l700),
    '--color-brand-800': hslToHex(h, sDark, l800),
    '--color-brand-900': hslToHex(h, sDark, l900),
  }
}

export function getPalette(key: string | null | undefined): Palette {
  if (!key) return PALETTES[0]
  // Custom hex colour — derive shades algorithmically
  if (key.startsWith('#') && key.length >= 4) {
    return {
      key,
      label: 'Custom',
      swatch: key,
      css: generatePaletteFromHex(key),
    }
  }
  return PALETTES.find(p => p.key === key) ?? PALETTES[0]
}

export function buildThemeCSS(palette: Palette): string {
  const vars = Object.entries(palette.css)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `:root {\n${vars}\n}`
}
