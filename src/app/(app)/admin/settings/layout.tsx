import { requireRole } from '@/lib/auth'
import { SettingsTabNav } from './TabNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['ad'])
  return (
    <div className="flex flex-col md:flex-row h-full">
      <SettingsTabNav />
      <div className="flex-1 overflow-y-auto min-w-0">
        {children}
      </div>
    </div>
  )
}
