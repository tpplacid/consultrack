import { requireSuperAdmin } from '@/lib/superadmin'
import { redirect } from 'next/navigation'

export default async function SuperAdminPage() {
  await requireSuperAdmin()
  redirect('/superadmin/orgs')
}
