'use client'

import { useState, useMemo } from 'react'
import { Employee, Lead, STAGE_LABELS } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { LeadCard } from '@/components/leads/LeadCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StageBadge } from '@/components/leads/StageBadge'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search, ArrowRightLeft, Download } from 'lucide-react'
import Link from 'next/link'

interface Props { admin: Employee; leads: Lead[]; employees: Employee[] }

export function AdminLeadsClient({ admin, leads: initialLeads, employees }: Props) {
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [transferModal, setTransferModal] = useState(false)
  const [newOwner, setNewOwner] = useState('')
  const [transferring, setTransferring] = useState(false)

  const filtered = useMemo(() => {
    let l = leads
    if (search) { const q = search.toLowerCase(); l = l.filter(x => x.name.toLowerCase().includes(q) || x.phone.includes(q)) }
    if (stageFilter) l = l.filter(x => x.main_stage === stageFilter)
    if (ownerFilter) l = l.filter(x => x.owner_id === ownerFilter)
    if (sourceFilter) l = l.filter(x => x.source === sourceFilter)
    return l
  }, [leads, search, stageFilter, ownerFilter, sourceFilter])

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectAll() {
    setSelected(filtered.map(l => l.id))
  }

  async function handleTransfer() {
    if (!newOwner || selected.length === 0) return
    setTransferring(true)
    const supabase = createClient()

    // Find new owner's manager
    const { data: emp } = await supabase.from('employees').select('reports_to').eq('id', newOwner).single()

    const { error } = await supabase
      .from('leads')
      .update({ owner_id: newOwner, reporting_manager_id: emp?.reports_to || null })
      .in('id', selected)

    if (error) toast.error(error.message)
    else {
      setLeads(prev => prev.map(l => selected.includes(l.id) ? { ...l, owner_id: newOwner } : l))
      setSelected([])
      setTransferModal(false)
      setNewOwner('')
      toast.success(`${selected.length} leads transferred`)
    }
    setTransferring(false)
  }

  function exportCSV() {
    const header = ['Name', 'Phone', 'Stage', 'Owner', 'Source', 'Location', 'Lead Type', 'Preferred Course', 'Updated At']
    const rows = filtered.map(l => [
      l.name, l.phone, l.main_stage,
      (l.owner as Employee)?.name || '',
      l.source, l.location || '', l.lead_type || '', l.preferred_course || '', l.updated_at,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'leads_export.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">All Leads</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download size={14} />
            Export CSV ({filtered.length})
          </Button>
          {selected.length > 0 && (
            <Button size="sm" onClick={() => setTransferModal(true)}>
              <ArrowRightLeft size={14} />
              Transfer {selected.length}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Stages</option>
          {Object.entries(STAGE_LABELS).map(([k,v]) => <option key={k} value={k}>{k} — {v}</option>)}
        </select>
        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Owners</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Sources</option>
          <option value="meta">Meta</option>
          <option value="offline">Offline</option>
          <option value="referral">Referral</option>
        </select>
        <button onClick={selectAll} className="text-sm text-indigo-600 hover:underline whitespace-nowrap">Select all ({filtered.length})</button>
      </div>

      {/* Lead Table (desktop) / Cards (mobile) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left"><input type="checkbox" onChange={e => e.target.checked ? selectAll() : setSelected([])} /></th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Source</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(l => (
              <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(l.id) ? 'bg-indigo-50' : ''}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                <td className="px-4 py-3"><Link href={`/leads/${l.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{l.name}</Link></td>
                <td className="px-4 py-3 text-slate-600">{l.phone}</td>
                <td className="px-4 py-3"><StageBadge stage={l.main_stage} /></td>
                <td className="px-4 py-3 text-slate-600">{(l.owner as Employee)?.name || '—'}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{l.source}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(l.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-10 text-center text-slate-400">No leads match filters</p>}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden grid gap-3">
        {filtered.map(l => <LeadCard key={l.id} lead={l} />)}
      </div>

      {/* Transfer Modal */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="Transfer Leads">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">Transferring <strong>{selected.length} lead(s)</strong> to:</p>
          <select value={newOwner} onChange={e => setNewOwner(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setTransferModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={transferring} disabled={!newOwner} onClick={handleTransfer}>Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
