import { requireSuperAdmin } from '@/lib/superadmin'
import { createAdminClient } from '@/lib/supabase/admin'
import SuperAdminNav from '../SuperAdminNav'

export const dynamic = 'force-dynamic'

export default async function SuperAdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin()

  let openTickets = 0
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
    openTickets = count ?? 0
  } catch {}

  return (
    <>
      <SuperAdminNav openTickets={openTickets} />
      {/* pt-14 = mobile topbar height; md:pl-56 = desktop sidebar width
          relative + z-10 so children sit above the gradient backdrop */}
      <div className="pt-14 md:pt-0 md:pl-56 relative" style={{ zIndex: 10 }}>
        {children}
      </div>
    </>
  )
}
