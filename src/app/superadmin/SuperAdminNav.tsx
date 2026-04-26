'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, LifeBuoy, LogOut, Zap } from 'lucide-react'

const navItems = [
  { href: '/superadmin/orgs',    label: 'Organisations', icon: Building2 },
  { href: '/superadmin/support', label: 'Support',       icon: LifeBuoy  },
]

interface Props { openTickets?: number }

export default function SuperAdminNav({ openTickets = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/superadmin/logout', { method: 'POST' })
    router.push('/superadmin/login')
    router.refresh()
  }

  return (
    <aside
      className="fixed top-0 left-0 h-full w-56 flex flex-col z-40 border-r border-white/[0.06]"
      style={{ background: 'linear-gradient(180deg, #0c1c28 0%, #091520 100%)' }}
    >
      {/* Logo */}
      <div className="px-4 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/40 flex-shrink-0">
            <Zap size={17} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Consultrack</p>
            <p className="text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(45,212,191,0.7)' }}>
              Super Admin
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative',
                active
                  ? 'text-teal-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              )}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.06) 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(20,184,166,0.25)',
              } : undefined}
            >
              <Icon size={16} className={active ? 'text-teal-400' : ''} />
              <span className="flex-1">{item.label}</span>
              {item.href === '/superadmin/support' && openTickets > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight">
                  {openTickets > 99 ? '99+' : openTickets}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
