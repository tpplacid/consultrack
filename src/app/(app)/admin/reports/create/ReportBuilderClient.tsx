'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { Employee } from '@/types'
import { SectionLayout } from '@/lib/fieldLayouts'
import { useOrgConfig } from '@/context/OrgConfigContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { subDays, format } from 'date-fns'
import { Plus, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Metric     = 'leads' | 'activities' | 'sla_breaches' | 'productivity'
type ChartType  = 'bar' | 'line' | 'pie' | 'table'
type DateRange  = 1 | 7 | 30 | 90

interface FilterRule {
  id: string
  field: string   // 'main_stage' | 'source' | 'owner_id' | ... | 'custom:key'
  value: string
}

interface ChartDataPoint { name: string; value: number }

interface ProductivityRow {
  employee: string
  calls: number
  whatsapp: number
  stage_changes: number
  comments: number
  total: number
}

interface Props {
  orgId: string
  employeeId: string
  employees: Employee[]
  sections: SectionLayout[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

// Static groupBy options for each metric (custom fields appended dynamically)
const STATIC_LEADS_GROUPBY = [
  { value: 'stage',            label: 'Stage' },
  { value: 'sub_stage',        label: 'Sub-stage' },
  { value: 'source',           label: 'Source' },
  { value: 'owner',            label: 'Owner' },
  { value: 'lead_type',        label: 'Lead Type' },
  { value: 'location',         label: 'Location / City' },
  { value: 'preferred_course', label: 'Preferred Course' },
  { value: 'decision_maker',   label: 'Decision Maker' },
  { value: 'loan_status',      label: 'Loan Status' },
  { value: 'income_status',    label: 'Income Status' },
  { value: 'date',             label: 'Created Date' },
]

const ACTIVITIES_GROUPBY = [
  { value: 'activity_type', label: 'Activity Type' },
  { value: 'owner',         label: 'Owner' },
  { value: 'date',          label: 'Date' },
]

const SLA_GROUPBY = [
  { value: 'stage',      label: 'Stage' },
  { value: 'owner',      label: 'Owner' },
  { value: 'resolution', label: 'Resolution' },
]

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 1,  label: 'Today' },
  { value: 7,  label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

// Fields available as filter targets on leads
// type: 'select' | 'text' | 'employee' | 'custom_select' | 'custom_text'
const STATIC_FILTER_FIELDS = [
  { value: 'main_stage',       label: 'Stage',           type: 'stage'    as const },
  { value: 'source',           label: 'Source',          type: 'select'   as const, options: ['meta','offline','referral'] },
  { value: 'owner_id',         label: 'Owner',           type: 'employee' as const },
  { value: 'lead_type',        label: 'Lead Type',       type: 'text'     as const },
  { value: 'location',         label: 'Location',        type: 'text'     as const },
  { value: 'preferred_course', label: 'Preferred Course',type: 'text'     as const },
  { value: 'decision_maker',   label: 'Decision Maker',  type: 'select'   as const, options: ['father','mother','sibling','relative'] },
  { value: 'loan_status',      label: 'Loan Status',     type: 'select'   as const, options: ['yes','no'] },
  { value: 'income_status',    label: 'Income Status',   type: 'text'     as const },
  { value: 'sub_stage',        label: 'Sub-stage',       type: 'text'     as const },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aggregateByKey<T extends Record<string, unknown>>(
  data: T[], keyFn: (item: T) => string
): ChartDataPoint[] {
  const counts: Record<string, number> = {}
  for (const item of data) {
    const k = keyFn(item)
    if (k) counts[k] = (counts[k] || 0) + 1
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

type LeadRow = Record<string, unknown>

function applyFilters(leads: LeadRow[], filters: FilterRule[]): LeadRow[] {
  return leads.filter(lead =>
    filters.every(f => {
      if (!f.value) return true
      if (f.field.startsWith('custom:')) {
        const key = f.field.slice(7)
        const cd = lead.custom_data as Record<string, unknown> | null
        return String(cd?.[key] ?? '').toLowerCase().includes(f.value.toLowerCase())
      }
      switch (f.field) {
        case 'owner_id':       return lead.owner_id === f.value
        case 'main_stage':     return lead.main_stage === f.value
        case 'source':         return lead.source === f.value
        case 'loan_status':    return lead.loan_status === f.value
        case 'decision_maker': return lead.decision_maker === f.value
        case 'lead_type':      return String(lead.lead_type ?? '').toLowerCase().includes(f.value.toLowerCase())
        case 'location':       return String(lead.location ?? '').toLowerCase().includes(f.value.toLowerCase())
        case 'preferred_course': return String(lead.preferred_course ?? '').toLowerCase().includes(f.value.toLowerCase())
        case 'income_status':  return String(lead.income_status ?? '').toLowerCase().includes(f.value.toLowerCase())
        case 'sub_stage':      return String(lead.sub_stage ?? '').toLowerCase().includes(f.value.toLowerCase())
        default:               return true
      }
    })
  )
}

// ─── Chart / Table renderers ──────────────────────────────────────────────────

function renderProductivityTable(rows: ProductivityRow[]) {
  if (!rows.length) return <EmptyState />
  const cols = [
    { key: 'employee',      label: 'Employee' },
    { key: 'calls',         label: 'Calls' },
    { key: 'whatsapp',      label: 'WhatsApp' },
    { key: 'stage_changes', label: 'Stage Changes' },
    { key: 'comments',      label: 'Comments' },
    { key: 'total',         label: 'Total' },
  ] as const
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {cols.map(c => (
              <th key={c.key} className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="py-2 px-3 font-medium text-slate-800">{r.employee}</td>
              <td className="py-2 px-3 text-slate-600">{r.calls}</td>
              <td className="py-2 px-3 text-slate-600">{r.whatsapp}</td>
              <td className="py-2 px-3 text-slate-600">{r.stage_changes}</td>
              <td className="py-2 px-3 text-slate-600">{r.comments}</td>
              <td className="py-2 px-3 font-bold text-slate-900">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderDataTable(data: ChartDataPoint[]) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  if (!sorted.length) return <EmptyState />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
            <th className="py-2 px-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="py-2 px-3 font-medium text-slate-800">{row.name}</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      No data for the selected configuration
    </div>
  )
}

function renderChart(chartType: ChartType, data: ChartDataPoint[]) {
  if (chartType === 'table') return renderDataTable(data)
  if (!data.length)          return <EmptyState />

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={110} dataKey="value"
            label={p => `${p.name ?? ''} ${(((p.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip /><Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip /><Legend />
          <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} name="Count" />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip /><Legend />
        <Bar dataKey="value" radius={[4,4,0,0]} name="Count">
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Filter row component ─────────────────────────────────────────────────────

function FilterRow({
  filter, employees, sections, stageKeys,
  onChange, onDelete,
}: {
  filter: FilterRule
  employees: Employee[]
  sections: SectionLayout[]
  stageKeys: { key: string; label: string }[]
  onChange: (f: FilterRule) => void
  onDelete: () => void
}) {
  // Build all filter field options: static + custom fields from org layout
  const customFilterFields = sections.flatMap(s =>
    s.fields
      .filter(f => f.type !== 'formula')
      .map(f => ({
        value: `custom:${f.key}`,
        label: `${f.label} (${s.section_name})`,
        type: f.type === 'select' ? 'custom_select' as const : 'text' as const,
        options: f.options,
      }))
  )
  const allFields = [
    ...STATIC_FILTER_FIELDS,
    ...customFilterFields,
  ]
  const selectedField = allFields.find(f => f.value === filter.field)

  const selectClass = "px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"

  function renderValueInput() {
    if (!filter.field) return null

    if (selectedField?.type === 'stage') {
      return (
        <select value={filter.value} onChange={e => onChange({ ...filter, value: e.target.value })} className={selectClass}>
          <option value="">Any stage</option>
          {stageKeys.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      )
    }
    if (selectedField?.type === 'select' || selectedField?.type === 'custom_select') {
      return (
        <select value={filter.value} onChange={e => onChange({ ...filter, value: e.target.value })} className={selectClass}>
          <option value="">Any</option>
          {(selectedField.options as string[]).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    if (selectedField?.type === 'employee') {
      return (
        <select value={filter.value} onChange={e => onChange({ ...filter, value: e.target.value })} className={selectClass}>
          <option value="">Any employee</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      )
    }
    return (
      <input
        type="text"
        value={filter.value}
        onChange={e => onChange({ ...filter, value: e.target.value })}
        placeholder="contains…"
        className={selectClass + ' w-full'}
      />
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Field selector */}
      <select
        value={filter.field}
        onChange={e => onChange({ ...filter, field: e.target.value, value: '' })}
        className={selectClass + ' flex-shrink-0 max-w-[160px]'}
      >
        <option value="">Select field…</option>
        <optgroup label="Lead Fields">
          {STATIC_FILTER_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </optgroup>
        {sections.length > 0 && (
          <optgroup label="Custom Fields">
            {customFilterFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </optgroup>
        )}
      </select>

      {/* Value input */}
      <div className="flex-1 min-w-0">
        {renderValueInput()}
      </div>

      {/* Remove */}
      <button onClick={onDelete} className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportBuilderClient({ orgId, employeeId, employees, sections }: Props) {
  const { stageMap } = useOrgConfig()
  const [isDesktop, setIsDesktop] = useState(false)

  // Config state
  const [reportName,     setReportName]     = useState('')
  const [metric,         setMetric]         = useState<Metric>('leads')
  const [groupBy,        setGroupBy]        = useState('stage')
  const [chartType,      setChartType]      = useState<ChartType>('bar')
  const [dateRange,      setDateRange]      = useState<DateRange>(30)
  const [filters,        setFilters]        = useState<FilterRule[]>([])
  const [visibleToTeam,  setVisibleToTeam]  = useState(false)

  // Preview state
  const [previewData,      setPreviewData]      = useState<ChartDataPoint[] | null>(null)
  const [productivityData, setProductivityData] = useState<ProductivityRow[] | null>(null)
  const [loadingPreview,   setLoadingPreview]   = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [saveError,        setSaveError]        = useState('')
  const [saveSuccess,      setSaveSuccess]      = useState(false)

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Build stageKeys list from stageMap
  const stageKeys = Object.entries(stageMap).map(([key, s]) => ({ key, label: `${key} — ${s.label}` }))

  // Build dynamic groupBy options: static + custom fields from layout
  const customGroupByOptions = sections.flatMap(s =>
    s.fields
      .filter(f => f.type !== 'formula')
      .map(f => ({ value: `custom:${f.key}`, label: `${f.label} (${s.section_name})` }))
  )

  const METRICS = [
    {
      value: 'leads' as const,
      label: 'Leads',
      groupByOptions: [...STATIC_LEADS_GROUPBY, ...customGroupByOptions],
    },
    {
      value: 'activities' as const,
      label: 'Activities',
      groupByOptions: ACTIVITIES_GROUPBY,
    },
    {
      value: 'productivity' as const,
      label: 'Employee Productivity',
      groupByOptions: [{ value: 'employee', label: 'Employee' }],
    },
    {
      value: 'sla_breaches' as const,
      label: 'SLA Breaches',
      groupByOptions: SLA_GROUPBY,
    },
  ]

  const currentMetric = METRICS.find(m => m.value === metric)!

  // Reset groupBy when metric changes
  useEffect(() => {
    const m = METRICS.find(m => m.value === metric)
    if (m) setGroupBy(m.groupByOptions[0].value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric])

  // Line chart only valid for date groupBy
  useEffect(() => {
    if (groupBy !== 'date' && chartType === 'line') setChartType('bar')
  }, [groupBy, chartType])

  // ── Filter helpers ──────────────────────────────────────────────────────────
  function addFilter() {
    setFilters(prev => [...prev, { id: crypto.randomUUID(), field: '', value: '' }])
  }
  function updateFilter(updated: FilterRule) {
    setFilters(prev => prev.map(f => f.id === updated.id ? updated : f))
  }
  function removeFilter(id: string) {
    setFilters(prev => prev.filter(f => f.id !== id))
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    setLoadingPreview(true)
    setPreviewData(null)
    setProductivityData(null)
    setSaveError('')

    try {
      const supabase = createClient()
      const cutoff = dateRange === 1
        ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
        : subDays(new Date(), dateRange).toISOString()

      // ── Leads ──────────────────────────────────────────────────────────────
      if (metric === 'leads') {
        const { data: rows, error } = await supabase
          .from('leads')
          .select([
            'main_stage', 'sub_stage', 'source', 'owner_id', 'lead_type',
            'location', 'preferred_course', 'decision_maker', 'loan_status',
            'income_status', 'twelfth_score', 'application_fees', 'booking_fees',
            'tuition_fees', 'custom_data', 'created_at',
            'owner:employees!leads_owner_id_fkey(name)',
          ].join(', '))
          .eq('org_id', orgId)
          .gte('created_at', cutoff)
        if (error) throw error

        const leads = applyFilters((rows || []) as unknown as LeadRow[], filters)

        let data: ChartDataPoint[] = []

        if (groupBy === 'stage') {
          data = aggregateByKey(leads, l => {
            const s = l.main_stage as string
            return s ? `${s} — ${stageMap[s]?.label ?? s}` : ''
          })
        } else if (groupBy === 'sub_stage') {
          data = aggregateByKey(leads, l => (l.sub_stage as string) || '(none)')
        } else if (groupBy === 'source') {
          data = aggregateByKey(leads, l => (l.source as string) || 'Unknown')
        } else if (groupBy === 'owner') {
          data = aggregateByKey(leads, l => {
            const o = l.owner as { name?: string } | null
            return o?.name || employees.find(e => e.id === l.owner_id)?.name || 'Unassigned'
          })
        } else if (groupBy === 'lead_type') {
          data = aggregateByKey(leads, l => (l.lead_type as string) || 'Not set')
        } else if (groupBy === 'location') {
          data = aggregateByKey(leads, l => (l.location as string) || 'Not set')
        } else if (groupBy === 'preferred_course') {
          data = aggregateByKey(leads, l => (l.preferred_course as string) || 'Not set')
        } else if (groupBy === 'decision_maker') {
          data = aggregateByKey(leads, l => (l.decision_maker as string) || 'Not set')
        } else if (groupBy === 'loan_status') {
          data = aggregateByKey(leads, l => (l.loan_status as string) || 'Unknown')
        } else if (groupBy === 'income_status') {
          data = aggregateByKey(leads, l => (l.income_status as string) || 'Not set')
        } else if (groupBy === 'date') {
          data = aggregateByKey(leads, l =>
            l.created_at ? format(new Date(l.created_at as string), 'dd MMM') : ''
          )
        } else if (groupBy.startsWith('custom:')) {
          const fieldKey = groupBy.slice(7)
          data = aggregateByKey(leads, l => {
            const cd = l.custom_data as Record<string, unknown> | null
            const v = cd?.[fieldKey]
            return v !== null && v !== undefined && v !== '' ? String(v) : 'Not set'
          })
        }

        setPreviewData(data)
      }

      // ── Activities ─────────────────────────────────────────────────────────
      else if (metric === 'activities') {
        const { data: rows, error } = await supabase
          .from('activities')
          .select('activity_type, employee_id, created_at, employee:employees(name)')
          .eq('org_id', orgId)
          .gte('created_at', cutoff)
        if (error) throw error

        const acts = rows || []
        let data: ChartDataPoint[] = []

        if (groupBy === 'activity_type') {
          data = aggregateByKey(acts, a => (a.activity_type as string)?.replace(/_/g, ' ') || 'Unknown')
        } else if (groupBy === 'owner') {
          data = aggregateByKey(acts, a => {
            const e = a.employee as { name?: string } | null
            return e?.name || employees.find(emp => emp.id === a.employee_id)?.name || 'Unknown'
          })
        } else if (groupBy === 'date') {
          data = aggregateByKey(acts, a =>
            a.created_at ? format(new Date(a.created_at as string), 'dd MMM') : ''
          )
        }
        setPreviewData(data)
      }

      // ── Employee Productivity ───────────────────────────────────────────────
      else if (metric === 'productivity') {
        const { data: rows, error } = await supabase
          .from('activities')
          .select('activity_type, employee_id, created_at, employee:employees(name)')
          .eq('org_id', orgId)
          .gte('created_at', cutoff)
        if (error) throw error

        const map: Record<string, ProductivityRow> = {}
        for (const a of rows || []) {
          const emp = a.employee as { name?: string } | null
          const name = emp?.name || employees.find(e => e.id === a.employee_id)?.name || 'Unknown'
          if (!map[name]) map[name] = { employee: name, calls: 0, whatsapp: 0, stage_changes: 0, comments: 0, total: 0 }
          const t = a.activity_type as string
          if (t === 'call_log')      map[name].calls++
          if (t === 'whatsapp_sent') map[name].whatsapp++
          if (t === 'stage_change')  map[name].stage_changes++
          if (t === 'comment')       map[name].comments++
          map[name].total++
        }
        setProductivityData(Object.values(map).sort((a, b) => b.total - a.total))
        setPreviewData([])
      }

      // ── SLA Breaches ───────────────────────────────────────────────────────
      else if (metric === 'sla_breaches') {
        const { data: rows, error } = await supabase
          .from('sla_breaches')
          .select('stage, owner_id, resolution, created_at, owner:employees!sla_breaches_owner_id_fkey(name)')
          .eq('org_id', orgId)
          .gte('created_at', cutoff)
        if (error) throw error

        const breaches = rows || []
        let data: ChartDataPoint[] = []

        if (groupBy === 'stage') {
          data = aggregateByKey(breaches, b => {
            const s = b.stage as string
            return s ? `${s} — ${stageMap[s]?.label ?? s}` : ''
          })
        } else if (groupBy === 'owner') {
          data = aggregateByKey(breaches, b => {
            const o = b.owner as { name?: string } | null
            return o?.name || employees.find(e => e.id === b.owner_id)?.name || 'Unknown'
          })
        } else if (groupBy === 'resolution') {
          data = aggregateByKey(breaches, b => (b.resolution as string)?.replace(/_/g, ' ') || 'Unknown')
        }
        setPreviewData(data)
      }
    } catch (err) {
      setSaveError('Failed to load preview data. Please try again.')
      console.error(err)
    } finally {
      setLoadingPreview(false)
    }
  }, [metric, groupBy, dateRange, filters, orgId, stageMap, employees])

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!reportName.trim()) { setSaveError('Please enter a report name.'); return }
    setSaving(true); setSaveError(''); setSaveSuccess(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('reports').insert({
        org_id: orgId, created_by: employeeId,
        name: reportName.trim(),
        config: { metric, groupBy, chartType, dateRange, filters },
        visible_to_team: visibleToTeam,
      })
      if (error) throw error
      setSaveSuccess(true); setReportName(''); setPreviewData(null); setProductivityData(null)
    } catch (err) {
      setSaveError('Failed to save report. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!isDesktop) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="max-w-sm mx-auto space-y-3">
          <div className="text-4xl">🖥️</div>
          <p className="text-lg font-semibold text-slate-700">Available on desktop only</p>
          <p className="text-sm">The report builder requires a larger screen.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Create Report</h1>

      <div className="flex gap-6">
        {/* ── Left panel: configuration ─────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Report name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Report Name</label>
                <input
                  type="text" value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  placeholder="e.g. Monthly Lead Source Breakdown"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Metric */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Metric</label>
                <select value={metric} onChange={e => setMetric(e.target.value as Metric)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Group By */}
              {metric !== 'productivity' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Group By</label>
                  <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {metric === 'leads' && (
                      <>
                        <optgroup label="Lead Fields">
                          {STATIC_LEADS_GROUPBY.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </optgroup>
                        {customGroupByOptions.length > 0 && (
                          <optgroup label="Custom Fields">
                            {customGroupByOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </optgroup>
                        )}
                      </>
                    )}
                    {metric !== 'leads' && currentMetric.groupByOptions.map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>
                    )}
                  </select>
                </div>
              )}

              {/* Chart Type */}
              {metric !== 'productivity' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Chart Type</label>
                  <select value={chartType} onChange={e => setChartType(e.target.value as ChartType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="bar">Bar Chart</option>
                    {groupBy === 'date' && <option value="line">Line Chart</option>}
                    <option value="pie">Pie Chart</option>
                    <option value="table">Table</option>
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Date Range</label>
                <select value={dateRange} onChange={e => setDateRange(Number(e.target.value) as DateRange)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Visible to team */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Visible to Team</label>
                <button type="button" role="switch" aria-checked={visibleToTeam}
                  onClick={() => setVisibleToTeam(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${visibleToTeam ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${visibleToTeam ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {saveError   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Report saved!</p>}

              <div className="flex flex-col gap-2 pt-1">
                <Button variant="secondary" onClick={handlePreview} loading={loadingPreview} className="w-full">Preview</Button>
                <Button variant="primary" onClick={handleSave} loading={saving} className="w-full">Save Report</Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Filters panel — only for leads metric ─────────────────── */}
          {metric === 'leads' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Filters</CardTitle>
                  <button onClick={addFilter}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                    <Plus size={12} /> Add
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">All filters are ANDed — leads must match every rule</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {filters.length === 0 ? (
                  <p className="text-xs text-slate-400">No filters — showing all leads in range</p>
                ) : (
                  filters.map(f => (
                    <FilterRow
                      key={f.id}
                      filter={f}
                      employees={employees}
                      sections={sections}
                      stageKeys={stageKeys}
                      onChange={updateFilter}
                      onDelete={() => removeFilter(f.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right panel: preview ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <Card className="h-full min-h-[480px]">
            <CardHeader>
              <CardTitle>
                {previewData !== null || productivityData !== null
                  ? reportName.trim() || `${currentMetric.label} by ${groupBy}`
                  : 'Chart Preview'}
              </CardTitle>
              {filters.length > 0 && previewData !== null && (
                <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                  {filters.filter(f => f.field && f.value).length} filter(s) active
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loadingPreview ? (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
                  <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Loading data…
                </div>
              ) : productivityData !== null ? (
                renderProductivityTable(productivityData)
              ) : previewData !== null ? (
                renderChart(chartType, previewData)
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                  <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">Configure your report and click Preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
