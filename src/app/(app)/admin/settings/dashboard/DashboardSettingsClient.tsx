'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, LayoutDashboard, X, Plus } from 'lucide-react'

interface Stage { key: string; label: string; is_lost: boolean; is_won: boolean; position: number }

interface Props {
  orgId:       string
  stages:      Stage[]
  initialKeys: string[]
}

export function DashboardSettingsClient({ orgId, stages, initialKeys }: Props) {
  const [keys,   setKeys]   = useState<string[]>(initialKeys)
  const [saving, setSaving] = useState(false)

  const stageMap = Object.fromEntries(stages.map(s => [s.key, s]))
  const available = stages.filter(s => !keys.includes(s.key))

  function add(key: string) {
    if (keys.length >= 4) { toast.error('Maximum 4 cards'); return }
    setKeys([...keys, key])
  }
  function remove(key: string) {
    setKeys(keys.filter(k => k !== key))
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...keys]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setKeys(next)
  }

  async function save() {
    if (keys.length === 0) { toast.error('Pick at least one stage'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('orgs').update({ dashboard_stage_keys: keys }).eq('id', orgId)
    if (error) toast.error(error.message)
    else toast.success('Dashboard cards updated')
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-800 flex items-center gap-2">
          <LayoutDashboard size={18} />
          Dashboard Cards
        </h1>
        <p className="text-[8px] text-brand-400 font-semibold mt-0.5">
          Pick which pipeline stages your team sees as headline cards on their dashboard
        </p>
      </div>

      {/* Selected cards */}
      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <p className="text-xs font-semibold text-brand-700 mb-3">Cards shown to your team ({keys.length}/4)</p>
        {keys.length === 0 ? (
          <p className="text-center py-6 text-sm text-brand-400">No cards selected — add some below</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k, i) => (
              <div key={k} className="flex items-center gap-2 bg-brand-50/50 border border-brand-100 rounded-lg px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="text-brand-400 hover:text-brand-700 disabled:opacity-20 text-xs leading-none">▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === keys.length - 1}
                    className="text-brand-400 hover:text-brand-700 disabled:opacity-20 text-xs leading-none">▼</button>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-500 bg-white px-2 py-0.5 rounded border border-brand-100">
                  {k}
                </span>
                <p className="flex-1 text-sm font-medium text-brand-800">{stageMap[k]?.label ?? k}</p>
                <button onClick={() => remove(k)} className="text-brand-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available stages */}
      {available.length > 0 && keys.length < 4 && (
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs font-semibold text-brand-700 mb-3">Add a stage</p>
          <div className="flex flex-wrap gap-2">
            {available.map(s => (
              <button key={s.key} onClick={() => add(s.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors">
                <Plus size={11} />
                {s.label}
                <span className="text-[10px] font-mono text-brand-400">·{s.key}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-brand-800 hover:bg-brand-900 text-white transition-colors disabled:opacity-60">
        {saving && <Loader2 size={13} className="animate-spin" />}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}
