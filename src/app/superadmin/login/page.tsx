import { isSuperAdmin } from '@/lib/superadmin'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLoginPage() {
  // Already authenticated — send straight to dashboard
  if (await isSuperAdmin()) redirect('/superadmin/orgs')
  return <LoginForm />
}
