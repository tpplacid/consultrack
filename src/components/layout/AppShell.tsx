'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Employee } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, FileText,
  BarChart3, Settings, LogOut, Menu, X, ChevronDown,
  Bell, Shield, UserCog, MessageSquare, CheckSquare, GitBranch, Upload
} from 'lucide-react'
import { RealtimeNotifier } from '@/components/RealtimeNotifier'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/attendance', label: 'Attendance', icon: <Calendar size={18} /> },
  { href: '/leaves', label: 'Leaves', icon: <ClipboardList size={18} /> },
  { href: '/templates', label: 'WA Templates', icon: <MessageSquare size={18} /> },
  { href: '/sla-explanations', label: 'SLA Explanations', icon: <Bell size={18} /> },
  { href: '/team', label: 'My Team', icon: <Users size={18} />, roles: ['tl', 'ad'] },
  { href: '/team/sla', label: 'SLA Breaches', icon: <Bell size={18} />, roles: ['tl', 'ad'] },
  { href: '/team/activity', label: 'Team Activity', icon: <BarChart3 size={18} />, roles: ['tl', 'ad'] },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/leads', label: 'All Leads', icon: <FileText size={18} /> },
  { href: '/admin/employees', label: 'Employees', icon: <UserCog size={18} /> },
  { href: '/admin/allocation', label: 'Allocation & Org', icon: <GitBranch size={18} /> },
  { href: '/admin/attendance', label: 'Attendance Mgmt', icon: <Calendar size={18} /> },
  { href: '/admin/leaves', label: 'Leave Mgmt', icon: <ClipboardList size={18} /> },
  { href: '/admin/offline-approvals', label: 'Offline Approvals', icon: <CheckSquare size={18} /> },
  { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { href: '/admin/templates', label: 'WA Templates', icon: <MessageSquare size={18} /> },
  { href: '/admin/meta', label: 'Meta Leads', icon: <Shield size={18} /> },
  { href: '/admin/sla', label: 'SLA Log', icon: <Bell size={18} /> },
  { href: '/admin/bulk-upload', label: 'Bulk Upload', icon: <Upload size={18} /> },
]

export function AppShell({ employee, children }: { employee: Employee; children: React.ReactNode }) {
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">A</span>
        </div>
        <span className="font-bold text-slate-900 text-lg">AdmiShine</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</p>
            </div>
            {adminNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-700 text-xs font-bold">{getInitials(employee.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{employee.name}</p>
            <p className="text-xs text-slate-500 capitalize">{employee.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0 lg:w-64 border-r border-slate-200 bg-white">
        <div className="flex flex-col w-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu size={22} />
          </button>
          <span className="font-bold text-slate-900">AdmiShine</span>
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-700 text-xs font-bold">{getInitials(employee.name)}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <RealtimeNotifier employeeId={employee.id} />
    </div>
  )
}
