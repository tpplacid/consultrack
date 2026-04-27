export const dynamic = 'force-dynamic'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-white" style={{ background: '#0d1b25' }}>
      {children}
    </div>
  )
}
