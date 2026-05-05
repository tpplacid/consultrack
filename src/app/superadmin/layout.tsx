import { Geist } from 'next/font/google'
import { ThemeBootstrapScript } from './SaThemeToggle'

export const dynamic = 'force-dynamic'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

// SA shell: animated cream→pink→peach gradient (light) or deep navy→violet
// (dark) — both with a live noise overlay. Theme is set BEFORE hydration via
// the bootstrap script so there's no flash. All children read CSS variables
// (--sa-text, --sa-surface, --sa-accent…) so theme switch is one DOM attribute.
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
