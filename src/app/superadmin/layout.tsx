import { Geist } from 'next/font/google'

export const dynamic = 'force-dynamic'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-screen text-white ${geist.className}`} style={{ background: '#000', fontFamily: 'var(--font-geist, system-ui, sans-serif)' }}>
      {children}
    </div>
  )
}
