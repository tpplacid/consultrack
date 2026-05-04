import { requireRole } from '@/lib/auth'
import { SettingsTabNav } from './TabNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['ad'])
  return (
    <div className="flex h-full">
      <SettingsTabNav />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
