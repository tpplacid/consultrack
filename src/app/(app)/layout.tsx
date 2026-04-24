import { requireAuth } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireAuth()
  return <AppShell employee={employee}>{children}</AppShell>
}
