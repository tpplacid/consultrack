'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, LifeBuoy, LogOut, Zap, Menu, X } from 'lucide-react'

const navItems = [
  { href: '/superadmin/orgs',    label: 'Organisations', icon: Building2 },
  { href: '/superadmin/support', label: 'Support',       icon: LifeBuoy  },
]

interface Props { openTickets?: number }

export default function SuperAdminNav({ openTickets = 0 }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    // Navigate directly to the logout GET route. The server clears the cookie
    // and redirects to /login in a single response — no client-side fetch race
    // that Arc and other strict browsers can interrupt before Set-Cookie lands.
    window.location.href = '/api/superadmin/logout'
  }

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0c1c28 0%, #091520 100%)' }}>
      {/* Logo */}
      <div className="px-4 pt-6 pb-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/40 flex-shrink-0">
            <Zap size={17} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Consultrack</p>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(45,212,191,0.7)' }}>
              Super Admin
            </p>
          </div>
        </div>
        {/* Mobile close */}
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-slate-500 hover:text-white transition p-1">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative',
                active ? 'text-teal-300' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
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
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:h-full md:w-56 md:flex md:flex-col z-40 border-r border-white/[0.06]">
        <NavContent />
      </aside>

      {/* Mobile topbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"
        style={{ background: '#0c1c28' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">Consultrack</span>
          <span className="text-[9px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded"
            style={{ color: 'rgba(45,212,191,0.8)', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
            SA
          </span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white p-1 transition">
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
