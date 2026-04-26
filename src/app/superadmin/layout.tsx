import { isSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import SuperAdminNav from './SuperAdminNav'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isSuperAdmin()

  let openTickets = 0
  if (authed) {
    try {
      const supabase = createAdminClient()
      const { count } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
      openTickets = count ?? 0
    } catch {}
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#0d1b25' }}>
      {authed && <SuperAdminNav openTickets={openTickets} />}
      <div className={authed ? 'pl-0 md:pl-56' : ''}>
        {children}
      </div>
    </div>
  )
}
