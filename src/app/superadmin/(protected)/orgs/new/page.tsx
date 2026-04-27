import { requireSuperAdmin } from '@/lib/superadmin'
import NewOrgClient from './NewOrgClient'

export default async function NewOrgPage() {
  await requireSuperAdmin()
  return <NewOrgClient />
}
