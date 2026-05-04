'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LifeBuoy, LogOut, Menu, X, BookOpen } from 'lucide-react'
import { SandboxLauncher } from './(protected)/SandboxLauncher'

const navItems = [
  { href: '/superadmin/orgs',    label: 'Organisations', icon: Building2, accent: '#06b6d4' }, // cyan
  { href: '/superadmin/support', label: 'Support',       icon: LifeBuoy,  accent: '#ec4899' }, // pink
  { href: '/superadmin/docs',    label: 'Docs',          icon: BookOpen,  accent: '#a855f7' }, // violet
]

interface Props { openTickets?: number }

export default function SuperAdminNav({ openTickets = 0 }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#000' }}>

      {/* Brand block — chunky neo-pop with hard yellow shadow */}
      <div className="px-4 pt-5 pb-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-lg"
              style={{
                background: '#fff',
                boxShadow: '3px 3px 0 0 #facc15',
                transform: 'translate(-1px,-1px)',
              }}>
              <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="black"/>
                <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="black"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none tracking-tight">CONSULTRACK</p>
              <p className="text-[9px] font-bold mt-1 tracking-[0.2em] uppercase"
                style={{ color: '#facc15' }}>SUPER ADMIN</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-neutral-600 hover:text-white transition p-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Sandbox quick launch — pinned at top */}
      <div className="px-3 pt-3">
        <SandboxLauncher />
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1.5 pt-3">
        <p className="px-1 mb-1 text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Workspaces
        </p>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className="block group transition-all"
              style={{
                transform: active ? 'translate(-1px,-1px)' : 'translate(0,0)',
              }}
            >
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-all border-2"
                style={{
                  borderColor: active ? item.accent : 'transparent',
                  background:  active ? `${item.accent}15` : 'transparent',
                  boxShadow:   active ? `3px 3px 0 0 ${item.accent}` : 'none',
                  color:       active ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                <Icon size={14} style={{ color: active ? item.accent : 'currentColor' }} />
                <span className="flex-1">{item.label}</span>
                {item.href === '/superadmin/support' && openTickets > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center leading-tight"
                    style={{ background: '#fff', color: '#000' }}>
                    {openTickets > 99 ? '99+' : openTickets}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <a href="/api/superadmin/logout"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold text-neutral-600 hover:text-white hover:bg-white/[0.04] transition-all">
          <LogOut size={14} />
          Sign out
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:h-full md:w-56 md:flex md:flex-col z-40"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <NavContent />
      </aside>

      {/* Mobile topbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: '#000', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: '#fff', boxShadow: '2px 2px 0 0 #facc15', transform: 'translate(-1px,-1px)' }}>
            <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="black"/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="black"/>
            </svg>
          </div>
          <span className="text-white font-black text-sm tracking-tight">CONSULTRACK</span>
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest"
            style={{ background: '#facc15', color: '#000' }}>SA</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-neutral-500 hover:text-white p-1 transition">
          <Menu size={18} />
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
