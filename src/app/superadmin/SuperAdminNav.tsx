'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, LifeBuoy, LogOut, Menu, X } from 'lucide-react'

const navItems = [
  { href: '/superadmin/orgs',    label: 'Organisations', icon: Building2 },
  { href: '/superadmin/support', label: 'Support',       icon: LifeBuoy  },
]

interface Props { openTickets?: number }

export default function SuperAdminNav({ openTickets = 0 }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <div className="flex flex-col h-full bg-black border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
            <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="black"/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="black"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight tracking-tight">Consultrack</p>
            <p className="text-[10px] text-neutral-500 font-medium mt-0.5">Super Admin</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-neutral-600 hover:text-white transition p-1">
          <X size={16} />
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
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'text-white bg-white/[0.08] border border-white/[0.1]'
                  : 'text-neutral-500 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <Icon size={15} className={active ? 'text-white' : 'text-neutral-600'} />
              <span className="flex-1">{item.label}</span>
              {item.href === '/superadmin/support' && openTickets > 0 && (
                <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                  {openTickets > 99 ? '99+' : openTickets}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — plain <a> so Arc cannot intercept JS */}
      <div className="p-3 border-t border-white/[0.06]">
        <a href="/api/superadmin/logout"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:text-white hover:bg-white/[0.04] transition-all">
          <LogOut size={15} />
          Sign out
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:h-full md:w-52 md:flex md:flex-col z-40">
        <NavContent />
      </aside>

      {/* Mobile topbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-black border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center p-0.5">
            <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="black"/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="black"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">Consultrack</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-white/20 text-neutral-400">SA</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-neutral-500 hover:text-white p-1 transition">
          <Menu size={18} />
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
