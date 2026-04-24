'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList
} from 'recharts'
import { Lead, Employee, STAGE_LABELS, LeadStage } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns'

interface Props {
  leads: Lead[]
  employees: Employee[]
  activities: Array<{ employee_id: string; activity_type: string; created_at: string }>
  slaBreaches: Array<{ owner_id: string; resolution: string; created_at: string }>
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export function AnalyticsClient({ leads, employees, activities, slaBreaches }: Props) {
  const [dateRange, setDateRange] = useState(30)
  const [empFilter, setEmpFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  // Apply filters
  const cutoff = useMemo(() => subDays(new Date(), dateRange).toISOString(), [dateRange])
  const filteredLeads = useMemo(() => {
    let l = leads.filter(x => x.created_at >= cutoff)
    if (empFilter) l = l.filter(x => x.owner_id === empFilter)
    if (stageFilter) l = l.filter(x => x.main_stage === stageFilter)
    if (sourceFilter) l = l.filter(x => x.source === sourceFilter)
    return l
  }, [leads, cutoff, empFilter, stageFilter, sourceFilter])

  // 1. Lead Funnel
  const funnelData = useMemo(() => {
    const stages: LeadStage[] = ['0', 'A', 'B', 'C', 'D', 'F']
    return stages.map(s => ({
      name: `${s} — ${STAGE_LABELS[s]}`,
      value: filteredLeads.filter(l => l.main_stage === s).length,
      stage: s,
    }))
  }, [filteredLeads])

  // 2. Source breakdown
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) counts[l.source] = (counts[l.source] || 0) + 1
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // 3. Daily lead inflow (last 30 days)
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })
    return days.map(d => {
      const key = format(d, 'yyyy-MM-dd')
      const count = leads.filter(l => l.created_at.startsWith(key)).length
      return { date: format(d, 'dd MMM'), count }
    })
  }, [leads])

  // 4. Counsellor performance
  const counsellorData = useMemo(() => {
    return employees.map(e => {
      const assigned = filteredLeads.filter(l => l.owner_id === e.id).length
      const contacted = filteredLeads.filter(l => l.owner_id === e.id && ['B', 'C', 'D', 'F'].includes(l.main_stage)).length
      const converted = filteredLeads.filter(l => l.owner_id === e.id && l.main_stage === 'F').length
      return { name: e.name.split(' ')[0], role: e.role, assigned, contacted, converted }
    }).filter(e => e.assigned > 0)
  }, [filteredLeads, employees])

  // 5. Stage-wise avg days
  const stageTimeData = useMemo(() => {
    const stages: LeadStage[] = ['A', 'B', 'C', 'D']
    return stages.map(s => {
      const stageLeads = filteredLeads.filter(l => l.main_stage === s && l.stage_entered_at)
      if (stageLeads.length === 0) return { stage: s, avgDays: 0 }
      const avgMs = stageLeads.reduce((sum, l) => {
        return sum + (new Date().getTime() - new Date(l.stage_entered_at).getTime())
      }, 0) / stageLeads.length
      return { stage: `${s} — ${STAGE_LABELS[s]}`, avgDays: Math.round(avgMs / (1000 * 60 * 60 * 24)) }
    })
  }, [filteredLeads])

  // 6. SLA compliance by employee
  const slaData = useMemo(() => {
    return employees.map(e => {
      const total = slaBreaches.filter(b => b.owner_id === e.id).length
      const resolved = slaBreaches.filter(b => b.owner_id === e.id && b.resolution === 'closed').length
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 100
      return { name: e.name.split(' ')[0], rate, total }
    }).filter(e => e.total > 0)
  }, [employees, slaBreaches])

  // 7. College interest heatmap
  const collegeData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) {
      for (const c of (l.interested_colleges || [])) {
        const college = c.trim()
        if (college) counts[college] = (counts[college] || 0) + 1
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // 8. Decision maker breakdown
  const decisionData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of filteredLeads) {
      if (l.decision_maker) counts[l.decision_maker] = (counts[l.decision_maker] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  // 9. Activity heatmap (last 7 days × employees)
  const activityHeatmap = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() })
    return employees.slice(0, 10).map(e => {
      const row: Record<string, string | number> = { name: e.name.split(' ')[0] }
      for (const d of days) {
        const key = format(d, 'yyyy-MM-dd')
        row[format(d, 'dd MMM')] = activities.filter(a =>
          a.employee_id === e.id && a.created_at.startsWith(key)
        ).length
      }
      return row
    })
  }, [employees, activities])

  // 10. Conversion by course
  const courseData = useMemo(() => {
    const counts: Record<string, { total: number; won: number }> = {}
    for (const l of filteredLeads) {
      if (!l.preferred_course) continue
      const c = l.preferred_course
      if (!counts[c]) counts[c] = { total: 0, won: 0 }
      counts[c].total++
      if (l.main_stage === 'F') counts[c].won++
    }
    return Object.entries(counts)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, v]) => ({ name, total: v.total, won: v.won, rate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0 }))
  }, [filteredLeads])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">Analytics Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Sources</option>
            <option value="meta">Meta</option>
            <option value="offline">Offline</option>
            <option value="referral">Referral</option>
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: filteredLeads.length, color: 'text-indigo-600' },
          { label: 'Hot Leads', value: filteredLeads.filter(l => l.main_stage === 'C').length, color: 'text-orange-600' },
          { label: 'Closed Won', value: filteredLeads.filter(l => l.main_stage === 'F').length, color: 'text-green-600' },
          { label: 'SLA Breaches', value: slaBreaches.filter(b => b.resolution === 'pending').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 1. Lead Funnel */}
      <Card>
        <CardHeader><CardTitle>Lead Funnel</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                {funnelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row: Source Pie + Decision Maker Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Lead Source Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(p) => `${p.name ?? ''} ${(((p.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}>
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Decision Maker Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={decisionData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(p) => `${p.name ?? ''} ${(((p.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}>
                  {decisionData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {decisionData.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No data</p>}
          </CardContent>
        </Card>
      </div>

      {/* 3. Daily lead inflow */}
      <Card>
        <CardHeader><CardTitle>Daily Lead Inflow (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} name="Leads" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. Counsellor performance */}
      <Card>
        <CardHeader><CardTitle>Counsellor Performance</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left font-medium text-slate-600">Name</th>
                <th className="py-2 text-left font-medium text-slate-600">Role</th>
                <th className="py-2 text-right font-medium text-slate-600">Assigned</th>
                <th className="py-2 text-right font-medium text-slate-600">Contacted</th>
                <th className="py-2 text-right font-medium text-slate-600">Converted</th>
                <th className="py-2 text-right font-medium text-slate-600">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {counsellorData.map(e => (
                <tr key={e.name}>
                  <td className="py-2 font-medium text-slate-900">{e.name}</td>
                  <td className="py-2 text-slate-500 capitalize">{e.role}</td>
                  <td className="py-2 text-right text-slate-700">{e.assigned}</td>
                  <td className="py-2 text-right text-slate-700">{e.contacted}</td>
                  <td className="py-2 text-right text-green-600 font-medium">{e.converted}</td>
                  <td className="py-2 text-right font-medium text-indigo-600">
                    {e.assigned > 0 ? `${Math.round((e.converted / e.assigned) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
              {counsellorData.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No data</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Row: Stage time + SLA compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Avg Days per Stage</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stageTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="avgDays" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Days" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>SLA Compliance Rate (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={slaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" fill="#22c55e" radius={[4, 4, 0, 0]} name="Compliance %" />
              </BarChart>
            </ResponsiveContainer>
            {slaData.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No SLA data</p>}
          </CardContent>
        </Card>
      </div>

      {/* 7. College interest */}
      <Card>
        <CardHeader><CardTitle>College Interest (Top 15)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={collegeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Interested" />
            </BarChart>
          </ResponsiveContainer>
          {collegeData.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No college data</p>}
        </CardContent>
      </Card>

      {/* 10. Conversion by course */}
      <Card>
        <CardHeader><CardTitle>Conversion by Course</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={courseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="total" fill="#6366f1" name="Total Leads" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="won" fill="#22c55e" name="Won" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {courseData.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No course data</p>}
        </CardContent>
      </Card>

      {/* 9. Activity heatmap */}
      <Card>
        <CardHeader><CardTitle>Activity Heatmap (Last 7 Days)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {activityHeatmap.length > 0 ? (
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-left font-medium text-slate-600 w-32">Employee</th>
                  {Object.keys(activityHeatmap[0]).filter(k => k !== 'name').map(d => (
                    <th key={d} className="py-2 text-center font-medium text-slate-600 text-xs">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityHeatmap.map(row => (
                  <tr key={row.name}>
                    <td className="py-2 font-medium text-slate-800 text-xs">{row.name}</td>
                    {Object.entries(row).filter(([k]) => k !== 'name').map(([day, count]) => {
                      const n = Number(count)
                      const bg = n === 0 ? 'bg-red-100' : n < 2 ? 'bg-yellow-100' : 'bg-green-100'
                      const text = n === 0 ? 'text-red-600' : n < 2 ? 'text-yellow-700' : 'text-green-700'
                      return (
                        <td key={day} className="py-2 text-center">
                          <span className={`inline-block w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center ${bg} ${text}`}>
                            {n}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-center text-sm text-slate-400 py-4">No activity data</p>}
        </CardContent>
      </Card>
    </div>
  )
}
