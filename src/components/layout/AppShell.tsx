'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Employee, formatRole } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { useOrgConfig, OrgFeatures } from '@/context/OrgConfigContext'
import { UpgradeModal } from '@/components/UpgradeModal'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, FileText,
  BarChart3, LogOut, Menu, Bell, Lock,
  MessageSquare, CheckSquare, TrendingDown,
  Settings, UsersRound, AlertCircle, PieChart, Ticket, Camera,
} from 'lucide-react'
import { RealtimeNotifier } from '@/components/RealtimeNotifier'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
  feature?: keyof OrgFeatures
  badgeKey?: 'slaExplanations' | 'teamBreaches' | 'adminBreaches' | 'pendingLeaves' | 'pendingAttendance'
}

const navItems: NavItem[] = [
  { href: '/dashboard',        label: 'Dashboard',         icon: <LayoutDashboard size={17} />, feature: 'lead_crm' },
  { href: '/attendance',       label: 'Attendance',        icon: <Calendar size={17} />,        feature: 'attendance' },
  { href: '/leaves',           label: 'Leaves',            icon: <ClipboardList size={17} />,   feature: 'attendance' },
  { href: '/templates',        label: 'WA Templates',      icon: <MessageSquare size={17} />,   feature: 'lead_crm' },
  { href: '/sla-explanations', label: 'SLA Explanations',  icon: <Bell size={17} />,            feature: 'sla', badgeKey: 'slaExplanations' },
  { href: '/team',             label: 'My Team',           icon: <Users size={17} />,           roles: ['tl','ad'] },
  { href: '/team/sla',         label: 'Deadline Breaches', icon: <Bell size={17} />,            roles: ['tl','ad'], feature: 'sla', badgeKey: 'teamBreaches' },
  { href: '/team/activity',    label: 'Team Activity',     icon: <BarChart3 size={17} />,       roles: ['tl','ad'], feature: 'lead_crm' },
]

const adminNavItems: NavItem[] = [
  { href: '/admin/leads',             label: 'All Leads',         icon: <FileText size={17} />,    feature: 'lead_crm' },
  { href: '/admin/offline-approvals', label: 'Offline Approvals', icon: <CheckSquare size={17} />, feature: 'lead_crm' },
  { href: '/admin/stuck-leads',       label: 'Stuck Leads',       icon: <TrendingDown size={17} />,feature: 'lead_crm' },
  { href: '/admin/instagram',         label: 'Instagram',         icon: <Camera size={17} />,      feature: 'instagram' },
]

const analyticsNavItems: NavItem[] = [
  { href: '/admin/reports', label: 'Analytics', icon: <PieChart size={17} />, feature: 'lead_crm' },
]

const teamNavItems: NavItem[] = [
  { href: '/admin/team-mgmt', label: 'Team Management', icon: <UsersRound size={17} />, badgeKey: 'pendingLeaves' },
]

const slaNavItems: NavItem[] = [
  { href: '/admin/sla-mgmt', label: 'SLA', icon: <AlertCircle size={17} />, feature: 'sla', badgeKey: 'adminBreaches' },
]

const settingsNavItems: NavItem[] = [
  { href: '/admin/settings', label: 'Settings', icon: <Settings size={17} /> },
  { href: '/admin/support',  label: 'Support',  icon: <Ticket size={17} /> },
]

// Labels + descriptions used in the UpgradeModal when a locked item is clicked
const FEATURE_META: Record<string, { label: string; description: string }> = {
  lead_crm:   {
    label: 'Lead CRM',
    description: 'Your leads, your stages, your templates — all in one place. Built to move fast.',
  },
  sla: {
    label: 'Deadline Breaches',
    description: 'Set deadline windows per pipeline stage. Breach alerts keep your team accountable and on schedule.',
  },
  attendance: {
    label: 'Attendance',
    description: 'Employee clock-in/out, leave requests, and weekoff configuration for your team.',
  },
  pipeline: {
    label: 'Pipeline Customisation',
    description: 'Build your pipeline exactly how you think. Every stage, every rule, your way.',
  },
  roles: {
    label: 'Custom Roles',
    description: 'Define custom roles and control exactly what each team member can see and do.',
  },
  meta: {
    label: 'Meta Integration',
    description: 'Leads from your Meta (Facebook & Instagram) campaigns land here instantly — no copy-paste, no lag.',
  },
  bulk_upload: {
    label: 'Bulk CSV Upload',
    description: 'Import hundreds of leads at once from a CSV file — map columns, validate data, and push straight into your pipeline.',
  },
}

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

  // ── Notification badge counts ────────────────────────────────────────────
  const [badges, setBadges] = useState({
    slaExplanations: 0,
    teamBreaches: 0,
    adminBreaches: 0,
    pendingLeaves: 0,
    pendingAttendance: 0,
  })
  const prevBadgesRef = useRef({ slaExplanations: 0, teamBreaches: 0, adminBreaches: 0, pendingLeaves: 0, pendingAttendance: 0 })

  const refreshBadges = useCallback(async () => {
    const supabase = createClient()
    const next = { slaExplanations: 0, teamBreaches: 0, adminBreaches: 0, pendingLeaves: 0, pendingAttendance: 0 }

    // My own pending explanations (explanation requested but I haven't submitted yet)
    const { count: slaExpCount } = await supabase
      .from('sla_breaches').select('*', { count: 'exact', head: true })
      .eq('owner_id', employee.id)
      .eq('resolution', 'explanation_requested')
      .eq('explanation_status', 'pending')
    next.slaExplanations = slaExpCount ?? 0

    if (employee.role === 'tl' || employee.role === 'ad') {
      // teamBreaches = pending breaches only for MY direct reports + myself
      // (matches the filter on /team/sla page)
      const { data: reportRows } = await supabase
        .from('employees').select('id').eq('reports_to', employee.id)
      const teamIds = [employee.id, ...(reportRows || []).map((r: { id: string }) => r.id)]
      const { count: teamCount } = await supabase
        .from('sla_breaches').select('*', { count: 'exact', head: true })
        .in('owner_id', teamIds)
        .eq('resolution', 'pending')
      next.teamBreaches = teamCount ?? 0
    }

    if (employee.role === 'ad') {
      // adminBreaches = all unresolved pending breaches org-wide (for admin SLA management)
      const { count: adminCount } = await supabase
        .from('sla_breaches').select('*', { count: 'exact', head: true })
        .eq('org_id', employee.org_id)
        .eq('resolution', 'pending')
      next.adminBreaches = adminCount ?? 0

      const { count: leaveCount } = await supabase
        .from('leaves').select('*', { count: 'exact', head: true })
        .eq('org_id', employee.org_id).eq('status', 'pending')
      next.pendingLeaves = leaveCount ?? 0

      const { count: attCount } = await supabase
        .from('attendance').select('*', { count: 'exact', head: true })
        .eq('org_id', employee.org_id).eq('status', 'questioned')
      next.pendingAttendance = attCount ?? 0
    }

    // Play sound if any count increased since last check
    const prev = prevBadgesRef.current
    const anyNew = (
      next.slaExplanations > prev.slaExplanations ||
      next.teamBreaches    > prev.teamBreaches    ||
      next.adminBreaches   > prev.adminBreaches   ||
      next.pendingLeaves   > prev.pendingLeaves   ||
      next.pendingAttendance > prev.pendingAttendance
    )
    if (anyNew) {
      try {
        const Ctx = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext
          || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (Ctx) {
          const ctx = new Ctx()
          const gain = ctx.createGain()
          gain.connect(ctx.destination)
          gain.gain.setValueAtTime(0.08, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          ;[523.25, 659.25].forEach((freq, i) => {
            const osc = ctx.createOscillator()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
            osc.connect(gain)
            osc.start(ctx.currentTime + i * 0.12)
            osc.stop(ctx.currentTime + i * 0.12 + 0.3)
          })
        }
      } catch { /* audio unavailable */ }
    }
    prevBadgesRef.current = next
    setBadges(next)
  }, [employee.id, employee.org_id, employee.role])

  useEffect(() => {
    refreshBadges()
    const supabase = createClient()
    const ch = supabase
      .channel('badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sla_breaches' }, refreshBadges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, refreshBadges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, refreshBadges)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refreshBadges])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  const isAdmin = employee.role === 'ad'

  // Passes role check — regardless of feature state
  function passesRole(item: NavItem): boolean {
    if (item.roles && !item.roles.includes(employee.role)) return false
    return true
  }

  // Feature is explicitly disabled for this item
  function isLocked(item: NavItem): boolean {
    return !!(item.feature && !features[item.feature])
  }

  // Used for old isVisible calls that filter out entirely (role only now)
  function isVisible(item: NavItem): boolean {
    return passesRole(item)
  }

  const visibleNav = navItems.filter(isVisible)

  const narrow = !collapsed && desktopW < 140

  // A locked sidebar item — shows dimmed with lock, opens UpgradeModal on click
  function LockedNavLink({ item, slim }: { item: NavItem; slim?: boolean }) {
    const [showModal, setShowModal] = useState(false)
    const meta = item.feature ? FEATURE_META[item.feature] : null
    if (!meta) return null
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          title={slim ? item.label : undefined}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors opacity-40 hover:opacity-60',
            slim ? 'px-3 py-2 justify-center' : 'px-3 py-2',
            'text-brand-100 hover:bg-brand-700 hover:text-white',
          )}
        >
          <span className="text-brand-200">{item.icon}</span>
          {!slim && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <Lock size={11} className="text-brand-300 flex-shrink-0" />
            </>
          )}
        </button>
        {showModal && (
          <UpgradeModal
            featureKey={item.feature!}
            featureLabel={meta.label}
            description={meta.description}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    )
  }

  function NavLink({ item, slim }: { item: NavItem; slim?: boolean }) {
    // Delegate locked items to LockedNavLink
    if (isLocked(item)) return <LockedNavLink item={item} slim={slim} />

    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
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
        <span className={cn('relative', active ? 'text-white' : 'text-brand-200')}>
          {item.icon}
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none shadow">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>
        {!slim && <span className="flex-1">{item.label}</span>}
        {!slim && badgeCount > 0 && (
          <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    )
  }

  const SidebarContent = ({ slim = false }: { slim?: boolean }) => (
    <div className="flex flex-col h-full bg-brand-800">
      {/* Logo: org's uploaded logo if present (kept brightness-0 invert so
          coloured logos read on the dark sidebar), otherwise an inline
          Consultrack mark — no file dependency, never breaks. */}
      <div className={cn('border-b border-brand-700 flex items-center justify-center', slim ? 'px-2 py-4' : 'px-5 py-4')}>
        {slim ? (
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs">
            {(orgName || 'A').charAt(0).toUpperCase()}
          </div>
        ) : orgLogoUrl ? (
          <img
            src={orgLogoUrl}
            alt={orgName || 'logo'}
            className="object-contain h-12 w-auto brightness-0 invert"
          />
        ) : (
          <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
            <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="white"/>
            <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="white"/>
          </svg>
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

            {/* Deadlines section — always show for admin even if SLA locked, so they see the upgrade prompt */}
            <>
              {!slim && <div className="pt-4 pb-1 px-3"><p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Deadlines</p></div>}
              {slim && <div className="pt-3 pb-1 px-3"><div className="h-px bg-brand-700" /></div>}
              {slaNavItems.filter(isVisible).map(item => <NavLink key={item.href} item={item} slim={slim} />)}
            </>

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
          {orgLogoUrl ? (
            <img
              src={orgLogoUrl}
              alt={orgName || 'logo'}
              className="object-contain h-8 w-auto brightness-0 invert"
            />
          ) : (
            <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <path d="M85 10H35C21.1929 10 10 21.1929 10 35V115C10 128.807 21.1929 140 35 140H85V105H45V45H85V10Z" fill="white"/>
              <path d="M110 10V60H100V90H110V140H140V10H110Z" fill="white"/>
            </svg>
          )}
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
