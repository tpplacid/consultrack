'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Employee, formatRole } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { useOrgConfig, OrgFeatures } from '@/context/OrgConfigContext'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, FileText,
  BarChart3, LogOut, Menu, Bell,
  MessageSquare, CheckSquare, TrendingDown,
  Settings, UsersRound, AlertCircle, PieChart, Ticket,
} from 'lucide-react'
import { RealtimeNotifier } from '@/components/RealtimeNotifier'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
  feature?: keyof OrgFeatures
}

const navItems: NavItem[] = [
  { href: '/dashboard',        label: 'Dashboard',         icon: <LayoutDashboard size={17} />, feature: 'lead_crm' },
  { href: '/attendance',       label: 'Attendance',        icon: <Calendar size={17} />,        feature: 'attendance' },
  { href: '/leaves',           label: 'Leaves',            icon: <ClipboardList size={17} />,   feature: 'attendance' },
  { href: '/templates',        label: 'WA Templates',      icon: <MessageSquare size={17} />,   feature: 'lead_crm' },
  { href: '/sla-explanations', label: 'SLA Explanations',  icon: <Bell size={17} />,            feature: 'sla' },
  { href: '/team',             label: 'My Team',           icon: <Users size={17} />,           roles: ['tl','ad'] },
  { href: '/team/sla',         label: 'Deadline Breaches', icon: <Bell size={17} />,            roles: ['tl','ad'], feature: 'sla' },
  { href: '/team/activity',    label: 'Team Activity',     icon: <BarChart3 size={17} />,       roles: ['tl','ad'], feature: 'lead_crm' },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/leads',             label: 'All Leads',         icon: <FileText size={17} />,    feature: 'lead_crm' },
  { href: '/admin/offline-approvals', label: 'Offline Approvals', icon: <CheckSquare size={17} />, feature: 'lead_crm' },
  { href: '/admin/stuck-leads',       label: 'Stuck Leads',       icon: <TrendingDown size={17} />,feature: 'lead_crm' },
]

const analyticsNavItems: NavItem[] = [
  { href: '/admin/reports', label: 'Analytics', icon: <PieChart size={17} />, feature: 'lead_crm' },
]

const teamNavItems: NavItem[] = [
  { href: '/admin/team-mgmt', label: 'Team Management', icon: <UsersRound size={17} /> },
]

const slaNavItems: NavItem[] = [
  { href: '/admin/sla-mgmt', label: 'SLA', icon: <AlertCircle size={17} />, feature: 'sla' },
]

const settingsNavItems: NavItem[] = [
  { href: '/admin/settings', label: 'Settings', icon: <Settings size={17} /> },
  { href: '/admin/support',  label: 'Support',  icon: <Ticket size={17} /> },
]

interface Props {
  employee: Employee
  children: React.ReactNode
  notifCount?: number
  orgLogoUrl?: string | null
  orgName?: string
}

export function AppShell({ employee, children, notifCount = 0, orgLogoUrl, orgName }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Desktop sidebar resize/collapse
  const [desktopW, setDesktopW] = useState(240)
  const [collapsed, setCollapsed] = useState(false)
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startW: desktopW }
    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return
      const next = Math.min(360, Math.max(160, resizeRef.current.startW + ev.clientX - resizeRef.current.startX))
      setDesktopW(next)
    }
    function onUp() {
      resizeRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [desktopW])

  const pathname = usePathname()
  const router = useRouter()
  const { features } = useOrgConfig()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  const isAdmin = employee.role === 'ad'

  function isVisible(item: NavItem): boolean {
    if (item.roles && !item.roles.includes(employee.role)) return false
    if (item.feature && !features[item.feature]) return false
    return true
  }

  const visibleNav = navItems.filter(isVisible)

  const narrow = !collapsed && desktopW < 140

  function NavLink({ item, slim }: { item: NavItem; slim?: boolean }) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        title={slim ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          slim ? 'px-3 py-2 justify-center' : 'px-3 py-2',
          active
            ? 'bg-brand-400 text-white'
            : 'text-brand-100 hover:bg-brand-700 hover:text-white'
        )}
      >
        <span className={active ? 'text-white' : 'text-brand-200'}>{item.icon}</span>
        {!slim && item.label}
      </Link>
    )
  }

  const SidebarContent = ({ slim = false }: { slim?: boolean }) => (
    <div className="flex flex-col h-full bg-brand-800">
      {/* Logo */}
      <div className={cn('border-b border-brand-700 flex items-center justify-center', slim ? 'px-2 py-4' : 'px-5 py-4')}>
        {slim ? (
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs">
            {(orgName || 'A').charAt(0).toUpperCase()}
          </div>
        ) : (
          <img
            src={orgLogoUrl || '/Admishine Logo.png'}
            alt={orgName || 'logo'}
            className="object-contain h-12 w-auto brightness-0 invert"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleNav.map(item => <NavLink key={item.href} item={item} slim={slim} />)}

        {isAdmin && (
          <>
            {adminNavItems.some(isVisible) && (
              <>
                {!slim && <div className="pt-4 pb-1 px-3"><p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Admin</p></div>}
                {slim && <div className="pt-3 pb-1 px-3"><div className="h-px bg-brand-700" /></div>}
                {adminNavItems.filter(isVisible).map(item => <NavLink key={item.href} item={item} slim={slim} />)}
              </>
            )}

            {analyticsNavItems.some(isVisible) && (
              <>
                {!slim && <div className="pt-4 pb-1 px-3"><p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Analytics</p></div>}
                {slim && <div className="pt-3 pb-1 px-3"><div className="h-px bg-brand-700" /></div>}
                {analyticsNavItems.filter(isVisible).map(item => <NavLink key={item.href} item={item} slim={slim} />)}
              </>
            )}

            {!slim && <div className="pt-4 pb-1 px-3"><p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Team</p></div>}
            {slim && <div className="pt-3 pb-1 px-3"><div className="h-px bg-brand-700" /></div>}
            {teamNavItems.map(item => <NavLink key={item.href} item={item} slim={slim} />)}

            {slaNavItems.some(isVisible) && (
              <>
                {!slim && <div className="pt-4 pb-1 px-3"><p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Deadlines</p></div>}
                {slim && <div className="pt-3 pb-1 px-3"><div className="h-px bg-brand-700" /></div>}
                {slaNavItems.filter(isVisible).map(item => <NavLink key={item.href} item={item} slim={slim} />)}
              </>
            )}

            {!slim && <div className="pt-4 pb-1 px-3"><p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Config</p></div>}
            {slim && <div className="pt-3 pb-1 px-3"><div className="h-px bg-brand-700" /></div>}
            {settingsNavItems.map(item => <NavLink key={item.href} item={item} slim={slim} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-brand-700 p-3">
        {slim ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="w-8 h-8 bg-brand-400 rounded-full flex items-center justify-center text-xs font-bold text-white" title={employee.name}>
              {getInitials(employee.name)}
            </div>
            <button onClick={handleLogout} className="text-brand-400 hover:text-white transition-colors" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-brand-700 transition-colors">
            <div className="w-8 h-8 bg-brand-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {getInitials(employee.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{employee.name}</p>
              <p className="text-xs text-brand-200">{formatRole(employee.role)}</p>
            </div>
            <button onClick={handleLogout} className="text-brand-300 hover:text-white transition-colors" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f6f6]">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-shrink-0 relative border-r border-brand-700 transition-all duration-200"
        style={{ width: collapsed ? 0 : desktopW }}
      >
        <div className="flex flex-col w-full overflow-hidden">
          <SidebarContent slim={narrow} />
        </div>

        {/* Drag resize handle */}
        {!collapsed && (
          <div
            onMouseDown={startResize}
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-400/40 transition-colors z-10"
            title="Drag to resize"
          />
        )}

        {/* Collapse toggle — a small tab on the right edge */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-3 h-10 bg-brand-700 hover:bg-brand-500 border border-brand-600 rounded-r-md flex items-center justify-center transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div className={`w-0.5 h-4 bg-brand-300 rounded transition-transform ${collapsed ? '' : 'opacity-60'}`} />
        </button>
      </aside>

      {/* Floating expand button when fully collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-6 h-14 bg-brand-800 hover:bg-brand-700 border border-brand-600 border-l-0 rounded-r-xl items-center justify-center transition-colors shadow-lg"
          title="Expand sidebar"
        >
          <Menu size={13} className="text-brand-300" />
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-brand-800 border-b border-brand-700 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-white p-1">
            <Menu size={22} />
          </button>
          <img
            src={orgLogoUrl || '/Admishine Logo.png'}
            alt={orgName || 'logo'}
            className="object-contain h-8 w-auto brightness-0 invert"
          />
          <div className="flex items-center gap-3">
            {notifCount > 0 && (
              <div className="relative">
                <Bell size={20} className="text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              </div>
            )}
            <div className="w-8 h-8 bg-brand-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {getInitials(employee.name)}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <RealtimeNotifier employeeId={employee.id} role={employee.role} orgId={employee.org_id} />
    </div>
  )
}
