'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Employee, Lead, LeadStage } from '@/types'
import { useOrgConfig } from '@/context/OrgConfigContext'
import { LeadCard } from '@/components/leads/LeadCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StageBadge } from '@/components/leads/StageBadge'
import { formatDateTime, lf, lfn, leadRevenue } from '@/lib/utils'
import { SectionLayout, getRevenueFieldDefs, getRevenueFieldKeys } from '@/lib/fieldLayouts'
import toast from 'react-hot-toast'
import { Search, ArrowRightLeft, Download, Layers, Tag, Trash2, SlidersHorizontal, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface Props { admin: Employee; leads: Lead[]; employees: Employee[]; sections: SectionLayout[] }

export function AdminLeadsClient({ admin, leads: initialLeads, employees, sections }: Props) {
  const revenueKeys = useMemo(() => getRevenueFieldKeys(sections), [sections])
  const revenueDefs = useMemo(() => getRevenueFieldDefs(sections), [sections])
  const { stages } = useOrgConfig()
  const searchParams = useSearchParams()
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  // Pre-fill source filter from ?source=… so sidebar entries like
  // "Facebook Leads" deep-link straight into a filtered view.
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Transfer
  const [transferModal, setTransferModal] = useState(false)
  const [newOwner, setNewOwner] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Mass stage update
  const [stageModal, setStageModal] = useState(false)
  const [newStage, setNewStage] = useState('')
  const [stagingBusy, setStagingBusy] = useState(false)

  // Mass source update
  const [sourceModal, setSourceModal] = useState(false)
  const [newSource, setNewSource] = useState('')
  const [sourcingBusy, setSourcingBusy] = useState(false)

  // Mass delete — two-step
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    let l = leads
    if (search) { const q = search.toLowerCase(); l = l.filter(x => x.name.toLowerCase().includes(q) || x.phone.includes(q)) }
    if (stageFilter) l = l.filter(x => x.main_stage === stageFilter)
    if (ownerFilter) l = l.filter(x => x.owner_id === ownerFilter)
    if (sourceFilter) l = l.filter(x => x.source === sourceFilter)
    if (dateFrom) l = l.filter(x => x.created_at >= dateFrom)
    if (dateTo) l = l.filter(x => x.created_at <= dateTo + 'T23:59:59')
    return l
  }, [leads, search, stageFilter, ownerFilter, sourceFilter, dateFrom, dateTo])

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function selectAll() { setSelected(filtered.map(l => l.id)) }

  async function handleTransfer() {
    if (!newOwner || selected.length === 0) return
    setTransferring(true)
    if (await callBulk('transfer', newOwner)) {
      setLeads(prev => prev.map(l => selected.includes(l.id) ? { ...l, owner_id: newOwner } : l))
      setSelected([]); setTransferModal(false); setNewOwner('')
      toast.success(`${selected.length} leads transferred`)
    }
    setTransferring(false)
  }

  async function callBulk(action: string, value?: string) {
    const res = await fetch('/api/admin/bulk-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids: selected, value }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || 'Failed'); return false }
    return true
  }

  async function handleBulkStage() {
    if (!newStage) return
    setStagingBusy(true)
    if (await callBulk('update_stage', newStage)) {
      setLeads(prev => prev.map(l => selected.includes(l.id) ? { ...l, main_stage: newStage as LeadStage } : l))
      toast.success(`${selected.length} leads moved to stage ${newStage}`)
      setSelected([]); setStageModal(false); setNewStage('')
    }
    setStagingBusy(false)
  }

  async function handleBulkSource() {
    if (!newSource) return
    setSourcingBusy(true)
    if (await callBulk('update_source', newSource)) {
      setLeads(prev => prev.map(l => selected.includes(l.id) ? { ...l, source: newSource as Lead['source'] } : l))
      toast.success(`${selected.length} leads source updated`)
      setSelected([]); setSourceModal(false); setNewSource('')
    }
    setSourcingBusy(false)
  }

  async function handleBulkDelete() {
    if (deleteText !== 'delete') return
    setDeleting(true)
    if (await callBulk('delete')) {
      setLeads(prev => prev.filter(l => !selected.includes(l.id)))
      toast.success(`${selected.length} leads deleted`)
      setSelected([]); setDeleteStep(0); setDeleteText('')
    }
    setDeleting(false)
  }

  function exportCSV() {
    const header = ['Name', 'Phone', 'Stage', 'Owner', 'Source', 'Location', 'Lead Type', 'Preferred Course', 'Updated At']
    const rows = filtered.map(l => [
      l.name, l.phone, l.main_stage,
      (l.owner as Employee)?.name || '',
      l.source, lf(l, 'location'), lf(l, 'lead_type'), lf(l, 'preferred_course'), l.updated_at,
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
        <div>
          <h1 className="text-xl font-bold text-brand-800">All Leads</h1>
          <p className="text-[8px] text-brand-400 font-semibold mt-0.5">Organisation-wide view of every lead — select multiple to perform bulk actions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download size={14} />Export CSV ({filtered.length})
          </Button>
          {selected.length > 0 && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setTransferModal(true)}>
                <ArrowRightLeft size={14} />Transfer
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setNewStage(''); setStageModal(true) }}>
                <Layers size={14} />Stage
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setNewSource(''); setSourceModal(true) }}>
                <Tag size={14} />Source
              </Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteStep(1)}>
                <Trash2 size={14} />Delete {selected.length}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Revenue summary — driven by org's currency-typed fields */}
      {(() => {
        if (revenueDefs.length === 0) return null
        const totalPayments = filtered.reduce((sum, l) => sum + leadRevenue(l, revenueKeys), 0)
        if (totalPayments === 0) return null
        const cols = Math.min(revenueDefs.length + 1, 4)
        return (
          <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${cols}`}>
            <div className="bg-brand-800 rounded-xl border border-brand-700 p-4">
              <p className="text-xs text-brand-200 font-semibold">Total Revenue</p>
              <p className="text-xl font-bold text-white mt-0.5">₹{totalPayments.toLocaleString('en-IN')}</p>
              <p className="text-[8px] text-brand-300 mt-1">All revenue fields combined</p>
            </div>
            {revenueDefs.map(def => {
              const v = filtered.reduce((sum, l) => sum + lfn(l, def.key), 0)
              return (
                <div key={def.key} className="bg-white rounded-xl border border-brand-100 p-4">
                  <p className="text-xs text-brand-600 font-semibold truncate">{def.label}</p>
                  <p className="text-xl font-bold text-brand-800 mt-0.5">₹{v.toLocaleString('en-IN')}</p>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Filters */}
      <div className="space-y-2">
        {/* Search + toggle row */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…"
              className="w-full pl-9 pr-3 py-2 border border-brand-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 text-brand-800" />
          </div>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              filtersOpen || stageFilter || ownerFilter || sourceFilter || dateFrom || dateTo
                ? 'border-brand-400 bg-brand-50 text-brand-600'
                : 'border-brand-200 bg-white text-brand-500 hover:border-brand-400'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {(stageFilter || ownerFilter || sourceFilter || dateFrom || dateTo) && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-400 text-white text-[9px] font-bold">
                {[stageFilter, ownerFilter, sourceFilter, dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
            <ChevronDown size={13} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={selectAll} className="text-sm font-bold text-brand-600 hover:underline whitespace-nowrap">
            Select all ({filtered.length})
          </button>
        </div>
        {/* Collapsible extra filters */}
        {filtersOpen && (
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="px-3 py-2 border border-brand-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-brand-700">
              <option value="">All Stages</option>
              {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="px-3 py-2 border border-brand-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-brand-700">
              <option value="">All Owners</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border border-brand-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-brand-700">
              <option value="">All Sources</option>
              <option value="meta">Meta</option>
              <option value="offline">Offline</option>
              <option value="referral">Referral</option>
            </select>
            <div className="flex items-center gap-1.5 border border-brand-200 rounded-lg bg-white px-3 py-2">
              <span className="text-xs text-brand-400 whitespace-nowrap">From</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="text-sm bg-transparent focus:outline-none text-brand-700 w-full" />
            </div>
            <div className="flex items-center gap-1.5 border border-brand-200 rounded-lg bg-white px-3 py-2">
              <span className="text-xs text-brand-400 whitespace-nowrap">To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="text-sm bg-transparent focus:outline-none text-brand-700 w-full" />
            </div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <p className="text-[8px] text-brand-500 font-semibold">{selected.length} lead(s) selected — use the action buttons above to transfer, re-stage, or delete</p>
      )}

      {/* Desktop table */}
      <div>
        <p className="text-[8px] text-brand-400 font-semibold mb-2">Lead table — click a name to open the full lead record</p>
        <div className="hidden md:block bg-white rounded-xl border border-brand-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-brand-50 border-b border-brand-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every(l => selected.includes(l.id))}
                    onChange={e => e.target.checked ? selectAll() : setSelected([])} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-brand-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-700">Phone</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-700">Stage</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-700">Owner</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-700">Source</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-700">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {filtered.map(l => (
              <tr key={l.id} className={`hover:bg-brand-50 transition-colors ${selected.includes(l.id) ? 'bg-brand-50' : ''}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                <td className="px-4 py-3"><Link href={`/leads/${l.id}`} className="font-semibold text-brand-800 hover:text-brand-500">{l.name}</Link></td>
                <td className="px-4 py-3 text-brand-600">{l.phone}</td>
                <td className="px-4 py-3"><StageBadge stage={l.main_stage} /></td>
                <td className="px-4 py-3 text-brand-600">{(l.owner as Employee)?.name || '—'}</td>
                <td className="px-4 py-3 capitalize text-brand-600">{l.source}</td>
                <td className="px-4 py-3 text-brand-400 text-xs">{formatDateTime(l.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-10 text-center text-brand-400">No leads match the selected filters.</p>}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0
          ? <p className="py-10 text-center text-brand-400 text-sm">No leads match the selected filters.</p>
          : filtered.map(l => <LeadCard key={l.id} lead={l} />)
        }
      </div>

      {/* Transfer Modal */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)} title={`Transfer ${selected.length} Lead(s)`}>
        <div className="p-5 space-y-4">
          <select value={newOwner} onChange={e => setNewOwner(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-brand-700">
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setTransferModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={transferring} disabled={!newOwner} onClick={handleTransfer}>Transfer</Button>
          </div>
        </div>
      </Modal>

      {/* Stage Update Modal */}
      <Modal open={stageModal} onClose={() => setStageModal(false)} title={`Update Stage — ${selected.length} lead(s)`}>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500">All selected leads will be moved to the chosen stage.</p>
          <select value={newStage} onChange={e => setNewStage(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select stage…</option>
            {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStageModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={stagingBusy} disabled={!newStage} onClick={handleBulkStage}>Update Stage</Button>
          </div>
        </div>
      </Modal>

      {/* Source Update Modal */}
      <Modal open={sourceModal} onClose={() => setSourceModal(false)} title={`Update Source — ${selected.length} lead(s)`}>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500">All selected leads will have their source updated.</p>
          <select value={newSource} onChange={e => setNewSource(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select source…</option>
            <option value="meta">Meta</option>
            <option value="offline">Offline</option>
            <option value="referral">Referral</option>
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSourceModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={sourcingBusy} disabled={!newSource} onClick={handleBulkSource}>Update Source</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Step 1 — first confirmation */}
      <Modal open={deleteStep === 1} onClose={() => setDeleteStep(0)} title="Delete Leads?">
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800">You are about to permanently delete {selected.length} lead(s).</p>
            <p className="text-xs text-red-700 mt-1">This cannot be undone. All associated activities will also be removed.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteStep(0)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={() => { setDeleteStep(2); setDeleteText('') }}>
              Yes, continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Step 2 — type 'delete' to confirm */}
      <Modal open={deleteStep === 2} onClose={() => { setDeleteStep(0); setDeleteText('') }} title="Final Confirmation">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">
            Type <strong className="font-mono bg-red-50 text-red-600 px-1 rounded">delete</strong> to permanently remove{' '}
            <strong>{selected.length} lead(s)</strong>.
          </p>
          <input
            value={deleteText}
            onChange={e => setDeleteText(e.target.value)}
            placeholder="Type: delete"
            autoFocus
            className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setDeleteStep(0); setDeleteText('') }}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={deleting}
              disabled={deleteText !== 'delete'} onClick={handleBulkDelete}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
