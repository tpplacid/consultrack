import { requireSuperAdmin } from '@/lib/superadmin'

export const dynamic = 'force-dynamic'

export default async function TestPage() {
  await requireSuperAdmin()
  return <div style={{ color: 'white', padding: 40 }}>✅ Auth works. Superadmin is accessible.</div>
}
