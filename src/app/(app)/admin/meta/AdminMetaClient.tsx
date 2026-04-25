'use client'

import { useState, useMemo } from 'react'
import { Employee, Lead } from '@/types'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/leads/StageBadge'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Download, Send, Wifi, ThumbsDown, ThumbsUp } from 'lucide-react'

const STAGES = [
  { value: '', label: 'All stages' },
  { value: '0', label: 'New' },
  { value: '1', label: 'Contacted' },
  { value: '2', label: 'Interested' },
  { value: '3', label: 'Follow Up' },
  { value: '4', label: 'Converted' },
  { value: '5', label: 'Not Interested' },
  { value: '6', label: 'Lost' },
]

interface Props { admin: Employee; metaLeads: Lead[]; lastSync: string | null }

export function AdminMetaClient({ admin, metaLeads, lastSync }: Props) {
  const [leads] = useState(metaLeads)
  const [selected, setSelected] = useState<string[]>([])
  const [pushing, setPushing] = useState(false)
  const [stageFilter, setStageFilter] = useState('')
  const [signal, setSignal] = useState<'BAD' | 'QUALIFIED'>('BAD')

  const filtered = useMemo(() =>
    stageFilter ? leads.filter(l => l.main_stage === stageFilter) : leads,
    [leads, stageFilter]
  )

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectFiltered() {
    setSelected(filtered.map(l => l.id))
  }

  function downloadCSV() {
    const target = selected.length > 0 ? leads.filter(l => selected.includes(l.id)) : filtered
    const headers = ['name', 'phone', 'source', 'stage', 'location', 'preferred_course', 'created_at']
    const rows = target.map(l => [l.name, l.phone, l.source, l.main_stage, l.location || '', l.preferred_course || '', l.created_at])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meta-leads-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function pushToMeta() {
    const ids = selected.length > 0 ? selected : filtered.map(l => l.id)
    if (ids.length === 0) return toast.error('No leads to push')
    setPushing(true)
    const res = await fetch('/api/meta/push-audience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_ids: ids, signal }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error || 'Failed')
    else toast.success(`Sent ${data.events_received} "${signal}" signals to Meta`)
    setPushing(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meta Leads Integration</h1>
          {lastSync && <p className="text-xs text-slate-500 mt-0.5">Last lead received: {formatDateTime(lastSync)}</p>}
        </div>
      </div>

      {/* Webhook Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Wifi size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Webhook Status</p>
            <p className="text-xs text-slate-500">Receiving leads automatically from Meta Lead Ads</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Filter + Push */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Push Signal to Meta</h3>
        <p className="text-xs text-slate-500">Select leads by stage, choose the signal quality, and push. Meta uses these signals to improve future ad targeting.</p>

        <div className="flex flex-wrap gap-3">
          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={e => { setStageFilter(e.target.value); setSelected([]) }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Signal type */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
            <button
              onClick={() => setSignal('BAD')}
              className={`flex items-center gap-1.5 px-3 py-2 ${signal === 'BAD' ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <ThumbsDown size={13} /> Unqualified
            </button>
            <button
              onClick={() => setSignal('QUALIFIED')}
              className={`flex items-center gap-1.5 px-3 py-2 border-l border-slate-300 ${signal === 'QUALIFIED' ? 'bg-green-50 text-green-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <ThumbsUp size={13} /> Qualified
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={selectFiltered}>
              Select {stageFilter ? 'Stage' : 'All'} ({filtered.length})
            </Button>
            <Button size="sm" variant="outline" onClick={downloadCSV}>
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" loading={pushing} onClick={pushToMeta}>
              <Send size={14} />
              Push {selected.length > 0 ? `(${selected.length})` : `(${filtered.length})`}
            </Button>
          </div>
        </div>

        {selected.length > 0 && (
          <p className="text-xs text-indigo-600">{selected.length} leads selected · <button onClick={() => setSelected([])} className="underline">Clear</button></p>
        )}
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={e => e.target.checked ? setSelected(filtered.map(l => l.id)) : setSelected([])}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Course</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(l => (
              <tr key={l.id} className={`hover:bg-slate-50 ${selected.includes(l.id) ? 'bg-indigo-50' : ''}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/leads/${l.id}`} className="text-slate-900 hover:text-indigo-600">{l.name}</Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{l.phone}</td>
                <td className="px-4 py-3"><StageBadge stage={l.main_stage} /></td>
                <td className="px-4 py-3 text-slate-500">{l.preferred_course || '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-slate-400">
            {leads.length === 0 ? 'No Meta leads yet. Webhook is waiting for events.' : 'No leads match the selected stage.'}
          </p>
        )}
      </div>
    </div>
  )
}
