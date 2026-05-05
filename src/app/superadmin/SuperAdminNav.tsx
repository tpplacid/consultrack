'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LifeBuoy, LogOut, Menu, X, BookOpen } from 'lucide-react'
import { SandboxLauncher } from './(protected)/SandboxLauncher'
import { SaThemeToggle } from './SaThemeToggle'

const navItems = [
  { href: '/superadmin/orgs',    label: 'Organisations', icon: Building2, accent: 'var(--sa-accent)' },
  { href: '/superadmin/support', label: 'Support',       icon: LifeBuoy,  accent: 'var(--sa-accent-2)' },
  { href: '/superadmin/docs',    label: 'Docs',          icon: BookOpen,  accent: 'var(--sa-accent-3)' },
]

interface Props { openTickets?: number }

export default function SuperAdminNav({ openTickets = 0 }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <div className="flex flex-col h-full"
      style={{
        background: 'var(--sa-surface)',
        backdropFilter: 'blur(12px)',
        borderRight: '1.5px solid var(--sa-border)',
      }}>

      {/* Brand block */}
      <div className="px-4 pt-5 pb-5 border-b" style={{ borderColor: 'var(--sa-divider)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-lg"
              style={{
                background: 'var(--sa-surface-strong)',
                border: '2px solid var(--sa-shadow-color)',
                boxShadow: '3px 3px 0 0 var(--sa-shadow-color)',
                transform: 'translate(-1px,-1px)',
              }}>
              <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="currentColor" style={{ color: 'var(--sa-text)' }}/>
                <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="currentColor" style={{ color: 'var(--sa-text)' }}/>
              </svg>
            </div>
            <div>
              <p className="font-black text-sm leading-none tracking-tight" style={{ color: 'var(--sa-text)' }}>CONSULTRACK</p>
              <p className="text-[9px] font-bold mt-1 tracking-[0.2em] uppercase" style={{ color: 'var(--sa-accent)' }}>SUPER ADMIN</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 transition" style={{ color: 'var(--sa-text-muted)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Sandbox quick launch */}
      <div className="px-3 pt-3">
        <SandboxLauncher />
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1.5 pt-3">
        <p className="px-1 mb-1 text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: 'var(--sa-text-muted)' }}>
          Workspaces
        </p>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block transition-all">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  border: '2px solid',
                  borderColor: active ? item.accent : 'transparent',
                  background:  active ? `color-mix(in srgb, ${item.accent} 12%, transparent)` : 'transparent',
                  boxShadow:   active ? `3px 3px 0 0 ${item.accent}` : 'none',
                  color:       active ? 'var(--sa-text)' : 'var(--sa-text-secondary)',
                  transform:   active ? 'translate(-1px,-1px)' : 'translate(0,0)',
                }}
              >
                <Icon size={14} style={{ color: active ? item.accent : 'currentColor' }} />
                <span className="flex-1">{item.label}</span>
                {item.href === '/superadmin/support' && openTickets > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center leading-tight"
                    style={{ background: 'var(--sa-text)', color: 'var(--sa-surface-strong)' }}>
                    {openTickets > 99 ? '99+' : openTickets}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Theme toggle + sign out */}
      <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--sa-divider)' }}>
        <SaThemeToggle />
        <a href="/api/superadmin/logout"
          className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-all"
          style={{
            color: 'var(--sa-text-secondary)',
            background: 'transparent',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-secondary)' }}>
          <LogOut size={14} />
          Sign out
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:h-full md:w-56 md:flex md:flex-col z-40">
        <NavContent />
      </aside>

      {/* Mobile topbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'var(--sa-surface)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1.5px solid var(--sa-border)',
        }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{
              background: 'var(--sa-surface-strong)',
              border: '2px solid var(--sa-shadow-color)',
              boxShadow: '2px 2px 0 0 var(--sa-shadow-color)',
              transform: 'translate(-1px,-1px)',
            }}>
            <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="currentColor" style={{ color: 'var(--sa-text)' }}/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="currentColor" style={{ color: 'var(--sa-text)' }}/>
            </svg>
          </div>
          <span className="font-black text-sm tracking-tight" style={{ color: 'var(--sa-text)' }}>CONSULTRACK</span>
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest"
            style={{ background: 'var(--sa-accent)', color: 'var(--sa-text-on-accent)' }}>SA</span>
        </div>
        <div className="flex items-center gap-2">
          <SaThemeToggle />
          <button onClick={() => setMobileOpen(true)} className="p-1 transition" style={{ color: 'var(--sa-text-secondary)' }}>
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'color-mix(in srgb, var(--sa-text) 60%, transparent)' }}
            onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
