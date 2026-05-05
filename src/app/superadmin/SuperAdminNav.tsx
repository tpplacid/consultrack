'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LifeBuoy, LogOut, Menu, X, BookOpen } from 'lucide-react'
import { SandboxLauncher } from './(protected)/SandboxLauncher'
import { SaThemeToggle } from './SaThemeToggle'

const navItems = [
  { href: '/superadmin/orgs',    label: 'Organisations', icon: Building2 },
  { href: '/superadmin/support', label: 'Support',       icon: LifeBuoy  },
  { href: '/superadmin/docs',    label: 'Docs',          icon: BookOpen  },
]

const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }

interface Props { openTickets?: number }

// Professional sidebar: clean surface with a refined right divider.
// Active state is an indigo-tinted pill with a subtle left accent bar.
// Single accent across all items — no per-item rainbow.
export default function SuperAdminNav({ openTickets = 0 }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <div
      className="flex flex-col h-full"
      style={{
        background: 'color-mix(in srgb, var(--sa-surface) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--sa-border)',
      }}
    >
      {/* Brand block */}
      <div className="px-5 pt-5 pb-5" style={{ borderBottom: '1px solid var(--sa-divider)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg"
              style={{
                background: 'var(--sa-accent)',
                boxShadow: 'var(--sa-shadow-sm)',
              }}
            >
              <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="white" />
                <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="white" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm leading-none tracking-tight" style={{ color: 'var(--sa-text)' }}>
                Consultrack
              </p>
              <p className="text-[10px] mt-1 tracking-[0.18em] uppercase" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>
                Super Admin
              </p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 transition" style={{ color: 'var(--sa-text-muted)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Sandbox quick launch */}
      <div className="px-3 pt-4">
        <SandboxLauncher />
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-0.5 pt-3">
        <p className="px-3 mb-2 text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: 'var(--sa-text-muted)' }}>
          Workspace
        </p>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block relative">
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                  style={{ background: 'var(--sa-accent)' }}
                />
              )}
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: active ? 'color-mix(in srgb, var(--sa-accent) 10%, transparent)' : 'transparent',
                  color:      active ? 'var(--sa-text)' : 'var(--sa-text-secondary)',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-hover)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--sa-text)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-secondary)'
                }}
              >
                <Icon size={14} style={{ color: active ? 'var(--sa-accent)' : 'currentColor' }} />
                <span className="flex-1">{item.label}</span>
                {item.href === '/superadmin/support' && openTickets > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md min-w-[18px] text-center leading-tight"
                    style={{
                      ...MONO,
                      background: 'var(--sa-accent)',
                      color: 'var(--sa-text-on-accent)',
                    }}
                  >
                    {openTickets > 99 ? '99+' : openTickets}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Theme toggle + sign out */}
      <div className="p-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--sa-divider)' }}>
        <SaThemeToggle />
        <a
          href="/api/superadmin/logout"
          className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ color: 'var(--sa-text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-secondary)' }}
        >
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
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'color-mix(in srgb, var(--sa-surface) 92%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--sa-border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'var(--sa-accent)' }}
          >
            <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="white" />
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--sa-text)' }}>Consultrack</span>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-widest"
            style={{ ...MONO, background: 'color-mix(in srgb, var(--sa-accent) 12%, transparent)', color: 'var(--sa-accent)' }}
          >
            SA
          </span>
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
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'color-mix(in srgb, var(--sa-text) 50%, transparent)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
