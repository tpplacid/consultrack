'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { LeadSource, DEFAULT_LEAD_SOURCES } from '@/context/OrgConfigContext'

interface Props {
  orgId: string
  initialSources: LeadSource[]
}

export function SourcesClient({ orgId, initialSources }: Props) {
  const [sources, setSources] = useState<LeadSource[]>(
    initialSources.length > 0 ? initialSources : DEFAULT_LEAD_SOURCES
  )
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)

  async function persist(updated: LeadSource[]) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('orgs').update({ lead_sources: updated }).eq('id', orgId)
    if (error) toast.error(error.message)
    else { setSources(updated); toast.success('Sources saved') }
    setSaving(false)
  }

  async function addSource() {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_')
    const label = newLabel.trim()
    if (!key || !label) return toast.error('Key and label required')
    if (sources.some(s => s.key === key)) return toast.error('Source key already exists')
    await persist([...sources, { key, label, sla_excluded: false }])
    setNewKey('')
    setNewLabel('')
  }

  async function toggleSlaExcluded(key: string) {
    await persist(sources.map(s => s.key === key ? { ...s, sla_excluded: !s.sla_excluded } : s))
  }

  async function removeSource(key: string) {
    await persist(sources.filter(s => s.key !== key))
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-800">Lead Sources</h1>
        <p className="text-[8px] text-brand-400 font-semibold mt-0.5">
          Configure lead source types. Sources marked as SLA-excluded skip deadline tracking.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 border-b border-brand-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-brand-500">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-brand-500">Label</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-brand-500">Skip deadlines</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {sources.map(s => (
              <tr key={s.key} className="hover:bg-brand-50/50">
                <td className="px-4 py-3">
                  <code className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-mono">{s.key}</code>
                </td>
                <td className="px-4 py-3 text-brand-800">{s.label}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleSlaExcluded(s.key)}
                    disabled={saving}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${s.sla_excluded ? 'bg-amber-400' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${s.sla_excluded ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => removeSource(s.key)} disabled={saving} className="text-brand-300 hover:text-red-500 transition-colors disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new source */}
      <div className="bg-white rounded-xl border border-brand-100 p-4 space-y-3">
        <p className="text-sm font-semibold text-brand-700">Add Source</p>
        <div className="flex gap-2">
          <input
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="key (e.g. website)"
            className="flex-1 text-sm px-3 py-2 border border-brand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Website)"
            className="flex-1 text-sm px-3 py-2 border border-brand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <Button size="sm" loading={saving} onClick={addSource}>
            <Plus size={14} />Add
          </Button>
        </div>
      </div>
    </div>
  )
}
