'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/superadmin/orgs', label: 'Organisations' },
]

export default function SuperAdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/superadmin/logout', { method: 'POST' })
    router.push('/superadmin/login')
    router.refresh()
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-40">
      <div className="px-4 py-5 border-b border-slate-800">
        <img src="/Consultrack Logo.png" alt="Consultrack" className="h-7 object-contain mb-1"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <p className="text-white font-bold text-sm leading-tight">Consultrack</p>
        <p className="text-teal-400 text-[10px] font-medium">Super Admin</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
