'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart,
} from 'recharts'
import { Lead, Employee, LeadStage } from '@/types'
import { useOrgConfig } from '@/context/OrgConfigContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { format, subDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, startOfWeek, parseISO } from 'date-fns'
import { lf } from '@/lib/utils'

interface Props {
  leads: Lead[]
  employees: Employee[]
  activities: Array<{ employee_id: string; activity_type: string; created_at: string }>
  slaBreaches: Array<{ owner_id: string; resolution: string; created_at: string }>
}

const TEAL = ['#3d9191', '#2a7070', '#1a4a50', '#88b8b8', '#5c9c9c', '#1f5560', '#b2d8d8', '#e6f4f4']

type GroupBy = 'daily' | 'weekly' | 'monthly'

export function AnalyticsClient({ leads, employees, activities, slaBreaches }: Props) {
  const { stages, stageMap } = useOrgConfig()
  const activeStages = stages.filter(s => !s.is_lost)
  const stageOrder = stages.map(s => s.key)
  const [dateRange, setDateRange] = useState(30)
  const [groupBy, setGroupBy] = useState<GroupBy>('daily')
  const [empFilter, setEmpFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // --- Filtered leads for range-based charts ---
  const cutoff = useMemo(() => subDays(new Date(), dateRange).toISOString(), [dateRange])
  const filteredLeads = useMemo(() => {
    let l = leads.filter(x => x.created_at >= cutoff)
    if (empFilter)      l = l.filter(x => x.owner_id === empFilter)
    if (stageFilter)    l = l.filter(x => x.main_stage === stageFilter)
    if (sourceFilter)   l = l.filter(x => x.source === sourceFilter)
    if (locationFilter) l = l.filter(x => (x as unknown as { location?: string }).location === locationFilter)
    return l
  }, [leads, cutoff, empFilter, stageFilter, sourceFilter, locationFilter])

  // All unique locations for filter dropdown
  const locations = useMemo(() => {
    const s = new Set<string>()
    for (const l of leads) {
      const loc = (l as unknown as { location?: string }).location
      if (loc) s.add(loc)
    }
    return Array.from(s).sort()
  }, [leads])

  // ── 1. Lead Funnel ──────────────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    return activeStages.map(s => ({
      name: s.label,
      value: filteredLeads.filter(l => l.main_stage === s.key).length,
    }))
  }, [filteredLeads, activeStages])

  // ── 2. Stage Conversion Rates ───────────────────────────────────────────────
  const conversionData = useMemo(() => {
    const pairs: [LeadStage, LeadStage, string][] = [
      ['0', 'A', '0→A'], ['A', 'B', 'A→B'], ['B', 'C', 'B→C'],
      ['C', 'D', 'C→D'], ['D', 'F', 'D→F'],
    ]
    return pairs.map(([from, to, label]) => {
      const fromCount = filteredLeads.filter(l => {
        const s = l.main_stage
        const order = stageOrder as LeadStage[]
        return order.indexOf(s) >= order.indexOf(from)
      }).length
      const toCount = filteredLeads.filter(l => {
        const s = l.main_stage
        const order = stageOrder as LeadStage[]
        return order.indexOf(s) >= order.indexOf(to)
      }).length
      const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0
      return { label, rate, from: fromCount, to: toCount }
    })
  }, [filteredLeads])

  // ── 3. Time-grouped lead inflow ─────────────────────────────────────────────
  const timeSeriesData = useMemo(() => {
    if (groupBy === 'monthly') {
      const months = eachMonthOfInterval({ start: subDays(new Date(), dateRange), end: new Date() })
      return months.map(m => {
        const key = format(m, 'yyyy-MM')
        const count = filteredLeads.filter(l => l.created_at.startsWith(key)).length
        const won   = filteredLeads.filter(l => l.created_at.startsWith(key) && l.main_stage === 'F').length
        return { period: format(m, 'MMM yy'), count, won }
      })
    }
    if (groupBy === 'weekly') {
      const weeks = eachWeekOfInterval({ start: subDays(new Date(), dateRange), end: new Date() })
      return weeks.map(w => {
        const key = format(w, 'yyyy-\'W\'ww')
        const count = filteredLeads.filter(l => format(parseISO(l.created_at), 'yyyy-\'W\'ww') === key).length
        const won   = filteredLeads.filter(l => format(parseISO(l.created_at), 'yyyy-\'W\'ww') === key && l.main_stage === 'F').length
        return { period: format(w, 'dd MMM'), count, won }
      })
    }
    // daily
    const days = eachDayOfInterval({ start: subDays(new Date(), Math.min(dateRange, 60)), end: new Date() })
    return days.map(d => {
      const key = format(d, 'yyyy-MM-dd')
      const count = filteredLeads.filter(l => l.created_at.startsWith(key)).length
      const won   = filteredLeads.filter(l => l.created_at.startsWith(key) && l.main_stage === 'F').length
      return { period: format(d, 'dd MMM'), count, won }
    })
  }, [filteredLeads, groupBy, dateRange])

  // ── 4. Source breakdown ─────────────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) counts[l.source] = (counts[l.source] || 0) + 1
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // ── 5. Win rate by source ───────────────────────────────────────────────────
  const winBySource = useMemo(() => {
    const map: Record<string, { total: number; won: number }> = {}
    for (const l of filteredLeads) {
      if (!map[l.source]) map[l.source] = { total: 0, won: 0 }
      map[l.source].total++
      if (l.main_stage === 'F') map[l.source].won++
    }
    return Object.entries(map).map(([source, v]) => ({
      source,
      total: v.total,
      won: v.won,
      rate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
    }))
  }, [filteredLeads])

  // ── 6. Counsellor performance ───────────────────────────────────────────────
  const counsellorData = useMemo(() => {
    return employees.map(e => {
      const empLeads = filteredLeads.filter(l => l.owner_id === e.id)
      const assigned  = empLeads.length
      const contacted = empLeads.filter(l => ['B','C','D','F'].includes(l.main_stage)).length
      const converted = empLeads.filter(l => l.main_stage === 'F').length
      const payments  = empLeads.reduce((sum, l) =>
        sum + ((l.application_fees || 0) + (l.booking_fees || 0) + (l.tuition_fees || 0)), 0)
      return { name: e.name.split(' ')[0], role: e.role, assigned, contacted, converted, payments }
    }).filter(e => e.assigned > 0)
  }, [filteredLeads, employees])

  // ── 7. Workload by stage (stacked bar per employee) ─────────────────────────
  const workloadData = useMemo(() => {
    return employees.map(e => {
      const row: Record<string, string | number> = { name: e.name.split(' ')[0] }
      for (const s of activeStages) row[s.key] = filteredLeads.filter(l => l.owner_id === e.id && l.main_stage === s.key).length
      return row
    }).filter(r => Object.values(r).some(v => typeof v === 'number' && v > 0))
  }, [filteredLeads, employees, activeStages])

  // ── 8. Avg days per stage ───────────────────────────────────────────────────
  const stageTimeData = useMemo(() => {
    return stages.filter(s => s.sla_days).map(s => {
      const sl = filteredLeads.filter(l => l.main_stage === s.key && l.stage_entered_at)
      if (!sl.length) return { stage: s.label, avgDays: 0 }
      const avg = sl.reduce((sum, l) => sum + (Date.now() - new Date(l.stage_entered_at).getTime()), 0) / sl.length
      return { stage: s.label, avgDays: Math.round(avg / (1000 * 60 * 60 * 24)) }
    })
  }, [filteredLeads, stages])

  // ── 9. SLA compliance ──────────────────────────────────────────────────────
  const slaData = useMemo(() => {
    return employees.map(e => {
      const total    = slaBreaches.filter(b => b.owner_id === e.id).length
      const resolved = slaBreaches.filter(b => b.owner_id === e.id && b.resolution === 'closed').length
      const rate     = total > 0 ? Math.round((resolved / total) * 100) : 100
      return { name: e.name.split(' ')[0], rate, total }
    }).filter(e => e.total > 0)
  }, [employees, slaBreaches])

  // ── 10. Payment breakdown by employee ──────────────────────────────────────
  const paymentData = useMemo(() => {
    return employees.map(e => {
      const el = filteredLeads.filter(l => l.owner_id === e.id)
      const app = el.reduce((s, l) => s + (l.application_fees || 0), 0)
      const bk  = el.reduce((s, l) => s + (l.booking_fees || 0), 0)
      const tu  = el.reduce((s, l) => s + (l.tuition_fees || 0), 0)
      return { name: e.name.split(' ')[0], application: app, booking: bk, tuition: tu, total: app + bk + tu }
    }).filter(e => e.total > 0).sort((a, b) => b.total - a.total)
  }, [filteredLeads, employees])

  const paymentTotals = useMemo(() => {
    const app  = filteredLeads.reduce((s, l) => s + (l.application_fees || 0), 0)
    const bk   = filteredLeads.reduce((s, l) => s + (l.booking_fees || 0), 0)
    const tu   = filteredLeads.reduce((s, l) => s + (l.tuition_fees || 0), 0)
    return { app, booking: bk, tuition: tu, total: app + bk + tu }
  }, [filteredLeads])

  // ── 11. College interest ────────────────────────────────────────────────────
  const collegeData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) {
      // colleges may be a comma-separated string (custom_data) or array (legacy column)
      const raw = lf(l, 'interested_colleges')
      if (!raw) continue
      for (const c of raw.split(',')) {
        const col = c.trim(); if (col) counts[col] = (counts[col] || 0) + 1
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // ── 12. Course conversion ───────────────────────────────────────────────────
  const courseData = useMemo(() => {
    const counts: Record<string, { total: number; won: number }> = {}
    for (const l of filteredLeads) {
      const course = lf(l, 'preferred_course')
      if (!course) continue
      if (!counts[course]) counts[course] = { total: 0, won: 0 }
      counts[course].total++
      if (l.main_stage === 'F') counts[course].won++
    }
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total).slice(0, 10)
      .map(([name, v]) => ({ name, total: v.total, won: v.won, rate: Math.round((v.won / v.total) * 100) }))
  }, [filteredLeads])

  // ── 13. Decision maker ─────────────────────────────────────────────────────
  const decisionData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) {
      const dm = lf(l, 'decision_maker')
      if (dm) counts[dm] = (counts[dm] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // ── 14. Loan status ────────────────────────────────────────────────────────
  const loanData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) {
      const ls = lf(l, 'loan_status') || 'unknown'
      counts[ls] = (counts[ls] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // ── 15. Income status ──────────────────────────────────────────────────────
  const incomeData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) {
      const is = lf(l, 'income_status')
      if (is) counts[is] = (counts[is] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // ── 16. Location distribution ──────────────────────────────────────────────
  const locationData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) {
      const loc = lf(l, 'location')
      if (loc) counts[loc] = (counts[loc] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // ── 17. Lead age distribution ──────────────────────────────────────────────
  const ageData = useMemo(() => {
    const now = Date.now()
    const buckets = [
      { label: '< 7 days',   fn: (d: number) => d < 7 },
      { label: '7 – 30 days',fn: (d: number) => d >= 7 && d < 30 },
      { label: '30 – 90 days',fn:(d: number) => d >= 30 && d < 90 },
      { label: '90+ days',   fn: (d: number) => d >= 90 },
    ]
    return buckets.map(b => ({
      label: b.label,
      count: filteredLeads.filter(l => b.fn(Math.floor((now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)))).length,
    }))
  }, [filteredLeads])

  // ── 18. Activity heatmap ───────────────────────────────────────────────────
  const activityHeatmap = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() })
    return employees.slice(0, 10).map(e => {
      const row: Record<string, string | number> = { name: e.name.split(' ')[0] }
      for (const d of days) {
        const key = format(d, 'yyyy-MM-dd')
        row[format(d, 'dd MMM')] = activities.filter(a => a.employee_id === e.id && a.created_at.startsWith(key)).length
      }
      return row
    })
  }, [employees, activities])

  // ── Payment totals for summary
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header + Filters ── */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">Analytics Dashboard</h1>
          <p className="text-[8px] text-brand-400 font-semibold mt-0.5">All charts reflect the active filters — use Group By to change time-series granularity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))} className="px-3 py-1.5 border border-brand-200 rounded-lg text-sm bg-white text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last 12 months</option>
          </select>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)} className="px-3 py-1.5 border border-brand-200 rounded-lg text-sm bg-white text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="daily">Group: Daily</option>
            <option value="weekly">Group: Weekly</option>
            <option value="monthly">Group: Monthly</option>
          </select>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="px-3 py-1.5 border border-brand-200 rounded-lg text-sm bg-white text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="px-3 py-1.5 border border-brand-200 rounded-lg text-sm bg-white text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">All Stages</option>
            {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-1.5 border border-brand-200 rounded-lg text-sm bg-white text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">All Sources</option>
            <option value="meta">Meta</option>
            <option value="offline">Offline</option>
            <option value="referral">Referral</option>
          </select>
          {locations.length > 0 && (
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="px-3 py-1.5 border border-brand-200 rounded-lg text-sm bg-white text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">All Locations</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Pipeline Summary ── */}
      <div>
        <p className="text-[8px] text-brand-400 font-semibold mb-2">Pipeline Summary — high-level counts for the selected period and filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Leads',  value: String(filteredLeads.length),                                        desc: 'All leads in range' },
            { label: 'Hot Leads',    value: String(filteredLeads.filter(l => l.main_stage === 'C').length),       desc: 'Stage C — high intent' },
            { label: 'Closed Won',   value: String(filteredLeads.filter(l => l.main_stage === 'F').length),       desc: 'Confirmed admissions' },
            { label: 'Deadline Breaches', value: String(slaBreaches.filter(b => b.resolution === 'pending').length),   desc: 'Unresolved violations' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-brand-100 rounded-xl p-4">
              <p className="text-xs text-brand-600 font-semibold">{s.label}</p>
              <p className="text-3xl font-bold mt-1 text-brand-800">{s.value}</p>
              <p className="text-[8px] text-brand-400 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue Summary ── */}
      <div>
        <p className="text-[8px] text-brand-400 font-semibold mb-2">Revenue Summary — total fees collected across all leads in the selected period</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-brand-800 border border-brand-700 rounded-xl p-4">
            <p className="text-xs text-brand-200 font-semibold">Total Collected</p>
            <p className="text-2xl font-bold text-white mt-1 truncate">{fmt(paymentTotals.total)}</p>
            <p className="text-[8px] text-brand-300 mt-1">All payment types combined</p>
          </div>
          {[
            { label: 'Application Fees', value: paymentTotals.app,     desc: 'Paid at application stage' },
            { label: 'Booking Fees',     value: paymentTotals.booking,  desc: 'Seat confirmation payment' },
            { label: 'Tuition Fees',     value: paymentTotals.tuition,  desc: 'Full course tuition' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-brand-100 rounded-xl p-4">
              <p className="text-xs text-brand-600 font-semibold">{s.label}</p>
              <p className="text-2xl font-bold text-brand-800 mt-1 truncate">{fmt(s.value)}</p>
              <p className="text-[8px] text-brand-400 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lead Inflow + Funnel (side by side) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Inflow</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">New leads and closed-won over time — granularity follows the Group By setting above</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3d9191" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3d9191" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a4a50" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1a4a50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="count" stroke="#3d9191" fill="url(#grad1)" name="New Leads" strokeWidth={2} />
                <Area type="monotone" dataKey="won"   stroke="#1a4a50" fill="url(#grad2)" name="Closed Won" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Volume at each pipeline stage — identifies drop-off points in the admission journey</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, i) => <Cell key={i} fill={TEAL[i % TEAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Stage Conversion Rates ── */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Conversion Rates</CardTitle>
          <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Percentage of leads that reach each subsequent stage — low rates indicate friction or drop-off at that transition</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="rate" name="Conversion %" radius={[4, 4, 0, 0]}>
                {conversionData.map((_, i) => <Cell key={i} fill={TEAL[i % TEAL.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Source Breakdown + Win Rate by Source ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Source Breakdown</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Distribution by acquisition channel — Meta ads, offline walk-ins, and referrals</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={(p) => `${p.name ?? ''} ${(((p.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}>
                  {sourceData.map((_, i) => <Cell key={i} fill={TEAL[i % TEAL.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Source</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Conversion rate to Closed Won for each lead source — reveals which channel produces the highest-quality leads</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={winBySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total" fill="#88b8b8" name="Total" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="won"   fill="#1a4a50" name="Won"   radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Counsellor Performance ── */}
      <Card>
        <CardHeader>
          <CardTitle>Counsellor Performance</CardTitle>
          <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Leads assigned, contacted, converted, and revenue collected per team member for the selected period</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-brand-100">
                <th className="py-2 text-left font-semibold text-brand-700">Name</th>
                <th className="py-2 text-left font-semibold text-brand-700">Role</th>
                <th className="py-2 text-right font-semibold text-brand-700">Assigned</th>
                <th className="py-2 text-right font-semibold text-brand-700">Contacted</th>
                <th className="py-2 text-right font-semibold text-brand-700">Converted</th>
                <th className="py-2 text-right font-semibold text-brand-700">Conv. %</th>
                <th className="py-2 text-right font-semibold text-brand-700">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {counsellorData.map(e => (
                <tr key={e.name} className="hover:bg-brand-50">
                  <td className="py-2 font-semibold text-brand-800">{e.name}</td>
                  <td className="py-2 text-brand-500 capitalize">{e.role}</td>
                  <td className="py-2 text-right text-brand-700">{e.assigned}</td>
                  <td className="py-2 text-right text-brand-700">{e.contacted}</td>
                  <td className="py-2 text-right text-brand-700 font-semibold">{e.converted}</td>
                  <td className="py-2 text-right font-bold text-brand-600">
                    {e.assigned > 0 ? `${Math.round((e.converted / e.assigned) * 100)}%` : '—'}
                  </td>
                  <td className="py-2 text-right text-brand-600 font-semibold">{fmt(e.payments)}</td>
                </tr>
              ))}
              {counsellorData.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-brand-400">No data for this period.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Workload by Stage ── */}
      <Card>
        <CardHeader>
          <CardTitle>Current Workload by Stage</CardTitle>
          <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Each employee's active leads broken down by pipeline stage — identifies imbalanced workloads</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              {activeStages.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={TEAL[i % TEAL.length]}
                  radius={i === activeStages.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          {workloadData.length === 0 && <p className="text-center text-sm text-brand-400 py-4">No data for the selected filters.</p>}
        </CardContent>
      </Card>

      {/* ── Avg Days + SLA ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Avg Days per Stage</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Average time leads currently spend at each active stage — longer bars signal bottlenecks</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stageTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                <XAxis dataKey="stage" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avgDays" fill="#3d9191" radius={[4, 4, 0, 0]} name="Avg Days" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Deadline Compliance</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Percentage of deadline violations resolved per counsellor — 100% means no outstanding breaches</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={slaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" fill="#2a7070" radius={[4, 4, 0, 0]} name="Compliance %" />
              </BarChart>
            </ResponsiveContainer>
            {slaData.length === 0 && <p className="text-center text-sm text-brand-400 py-4">No deadline breach data.</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── Payment Collections ── */}
      {paymentData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Collections by Employee</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Application, booking, and tuition fees collected per counsellor — stacked to show contribution mix</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => typeof v === 'number' ? fmt(v) : v} />
                <Legend />
                <Bar dataKey="application" stackId="a" fill="#88b8b8" name="Application" />
                <Bar dataKey="booking"     stackId="a" fill="#3d9191" name="Booking" />
                <Bar dataKey="tuition"     stackId="a" fill="#1a4a50" name="Tuition" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Lead Age + Location ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Age Distribution</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">How long leads have been in the system — a large 90+ bucket indicates pipeline stagnation</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                  {ageData.map((_, i) => <Cell key={i} fill={TEAL[i % TEAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Distribution — Top 15</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Cities with the most leads — useful for understanding geographic demand and planning outreach</p>
          </CardHeader>
          <CardContent>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={locationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#5c9c9c" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-sm text-brand-400 py-8">No location data recorded yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── College + Course ── */}
      <Card>
        <CardHeader>
          <CardTitle>College Interest — Top 15</CardTitle>
          <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Institutions most frequently listed by leads — highlights high-demand college partnerships</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={collegeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3d9191" radius={[0, 4, 4, 0]} name="Interested" />
            </BarChart>
          </ResponsiveContainer>
          {collegeData.length === 0 && <p className="text-center text-sm text-brand-400 py-4">No college preference data.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion by Course</CardTitle>
          <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Lead volume and confirmed admissions by preferred course — reveals which programmes close most effectively</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={courseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#88b8b8" name="Total Leads" radius={[4, 4, 0, 0]} />
              <Bar dataKey="won"   fill="#1a4a50" name="Closed Won"  radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {courseData.length === 0 && <p className="text-center text-sm text-brand-400 py-4">No course preference data.</p>}
        </CardContent>
      </Card>

      {/* ── Decision Maker + Loan + Income ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Decision Maker</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Who makes the final admission call — helps focus counselling on the right person</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={decisionData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={(p) => `${p.name ?? ''} ${(((p.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}>
                  {decisionData.map((_, i) => <Cell key={i} fill={TEAL[i % TEAL.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {decisionData.length === 0 && <p className="text-center text-sm text-brand-400 py-4">No data.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Requirement</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Proportion of leads that need a loan — informs partnership with financial institutions</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={loanData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={(p) => `${p.name ?? ''} ${(((p.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}>
                  {loanData.map((_, i) => <Cell key={i} fill={TEAL[i % TEAL.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {loanData.length === 0 && <p className="text-center text-sm text-brand-400 py-4">No data.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income Status</CardTitle>
            <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Family income brackets across your leads — helps position scholarship and loan options appropriately</p>
          </CardHeader>
          <CardContent>
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incomeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6f4f4" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2a7070" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-sm text-brand-400 py-8">No income data recorded yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── Activity Heatmap ── */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap — Last 7 Days</CardTitle>
          <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Daily action count per team member — green indicates active engagement, red indicates no recorded actions that day</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {activityHeatmap.length > 0 ? (
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-brand-100">
                  <th className="py-2 text-left font-semibold text-brand-700 w-32">Employee</th>
                  {Object.keys(activityHeatmap[0]).filter(k => k !== 'name').map(d => (
                    <th key={d} className="py-2 text-center font-semibold text-brand-600 text-xs">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {activityHeatmap.map(row => (
                  <tr key={row.name}>
                    <td className="py-2 font-semibold text-brand-800 text-xs">{row.name}</td>
                    {Object.entries(row).filter(([k]) => k !== 'name').map(([day, count]) => {
                      const n = Number(count)
                      const bg   = n === 0 ? 'bg-red-100'    : n < 2 ? 'bg-brand-100'   : 'bg-brand-400'
                      const text = n === 0 ? 'text-red-600'  : n < 2 ? 'text-brand-700'  : 'text-white'
                      return (
                        <td key={day} className="py-2 text-center">
                          <span className={`inline-flex w-8 h-8 rounded-lg text-xs font-bold items-center justify-center ${bg} ${text}`}>
                            {n}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-center text-sm text-brand-400 py-4">No activity data for this period.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
