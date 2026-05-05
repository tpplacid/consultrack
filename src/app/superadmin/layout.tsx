import { Geist } from 'next/font/google'
import { ThemeBootstrapScript } from './SaThemeToggle'

export const dynamic = 'force-dynamic'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

// SA shell: live moving noise gradient (ivory→beige→cool grey on light,
// deep slate-navy→indigo on dark). Theme is set BEFORE hydration via the
// bootstrap script so there's no flash of the wrong palette. All children
// read CSS variables (--sa-text, --sa-surface, --sa-accent…) so flipping
// data-sa-theme on <html> swaps the entire panel atomically.
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeBootstrapScript />
      <div className={`relative min-h-screen sa-root-bg ${geist.className}`}
        style={{ fontFamily: 'var(--font-geist, system-ui, sans-serif)' }}>
        {children}
      </div>
    </>
  )
}
