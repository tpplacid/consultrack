'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Employee, formatRole } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, FileText,
  BarChart3, LogOut, Menu, Bell, Shield, UserCog,
  MessageSquare, CheckSquare, GitBranch, Upload, TrendingDown,
  Settings, UsersRound, AlertCircle, PieChart,
} from 'lucide-react'
import { RealtimeNotifier } from '@/components/RealtimeNotifier'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',        label: 'Dashboard',        icon: <LayoutDashboard size={17} /> },
  { href: '/attendance',       label: 'Attendance',       icon: <Calendar size={17} /> },
  { href: '/leaves',           label: 'Leaves',           icon: <ClipboardList size={17} /> },
  { href: '/templates',        label: 'WA Templates',     icon: <MessageSquare size={17} /> },
  { href: '/sla-explanations', label: 'SLA Explanations', icon: <Bell size={17} /> },
  { href: '/team',             label: 'My Team',          icon: <Users size={17} />, roles: ['tl','ad'] },
  { href: '/team/sla',         label: 'SLA Breaches',     icon: <Bell size={17} />, roles: ['tl','ad'] },
  { href: '/team/activity',    label: 'Team Activity',    icon: <BarChart3 size={17} />, roles: ['tl','ad'] },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/leads',            label: 'All Leads',        icon: <FileText size={17} /> },
  { href: '/admin/offline-approvals',label: 'Offline Approvals',icon: <CheckSquare size={17} /> },
  { href: '/admin/stuck-leads',      label: 'Stuck Leads',      icon: <TrendingDown size={17} /> },
]

const analyticsNavItems: NavItem[] = [
  { href: '/admin/reports',          label: 'Analytics',        icon: <PieChart size={17} /> },
]

const teamNavItems: NavItem[] = [
  { href: '/admin/team-mgmt',        label: 'Team Management',  icon: <UsersRound size={17} /> },
]

const slaNavItems: NavItem[] = [
  { href: '/admin/sla-mgmt',         label: 'SLA',              icon: <AlertCircle size={17} /> },
]

const settingsNavItems: NavItem[] = [
  { href: '/admin/settings',         label: 'Settings',         icon: <Settings size={17} /> },
]

interface Props {
  employee: Employee
  children: React.ReactNode
  notifCount?: number
}

export function AppShell({ employee, children, notifCount = 0 }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  const isAdmin = employee.role === 'ad'
  const visibleNav = navItems.filter(item => !item.roles || item.roles.includes(employee.role))

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-brand-400 text-white'
            : 'text-brand-100 hover:bg-brand-700 hover:text-white'
        )}
      >
        <span className={active ? 'text-white' : 'text-brand-200'}>{item.icon}</span>
        {item.label}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-brand-800">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-brand-700 flex items-center justify-center">
        <Image src="/Admishine Logo.png" alt="admishine" width={160} height={60} className="object-contain h-12 w-auto brightness-0 invert" priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleNav.map(item => <NavLink key={item.href} item={item} />)}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Admin</p>
            </div>
            {adminNavItems.map(item => <NavLink key={item.href} item={item} />)}
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Analytics</p>
            </div>
            {analyticsNavItems.map(item => <NavLink key={item.href} item={item} />)}
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Team</p>
            </div>
            {teamNavItems.map(item => <NavLink key={item.href} item={item} />)}
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">SLA</p>
            </div>
            {slaNavItems.map(item => <NavLink key={item.href} item={item} />)}
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Config</p>
            </div>
            {settingsNavItems.map(item => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-brand-700 p-3">
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
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f6f6]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0 lg:w-60 border-r border-brand-700">
        <div className="flex flex-col w-full">
          <SidebarContent />
        </div>
      </aside>

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
          <Image src="/Admishine Logo.png" alt="admishine" width={110} height={36} className="object-contain h-8 w-auto brightness-0 invert" />
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
