'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS } from '@/types'

const SLA_STAGES = [
  { stage: 'A', label: 'Cold/Warm Calling' },
  { stage: 'B', label: 'Follow Up' },
  { stage: 'C', label: 'Hot Lead' },
  { stage: 'D', label: 'Admission Application' },
]

interface Props { orgId: string; slaConfig: Record<string, number> }

export function SlaThresholdsClient({ orgId, slaConfig: initial }: Props) {
  const [config, setConfig] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('orgs').update({ sla_config: config }).eq('id', orgId)
    if (error) toast.error(error.message)
    else toast.success('SLA thresholds saved')
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Deadline Thresholds</h1>
        <p className="text-sm text-slate-500 mt-1">Set how many days a lead can remain at each stage before a deadline breach is triggered. Referral and offline leads are excluded.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {SLA_STAGES.map(({ stage, label }) => (
          <div key={stage} className="flex items-center justify-between px-5 py-4 gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Stage {stage} — {label}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={90}
                value={config[stage] ?? ''}
                onChange={e => setConfig(prev => ({ ...prev, [stage]: parseInt(e.target.value) || 1 }))}
                className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500">days</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Note</p>
        <ul className="space-y-1 text-xs list-disc list-inside">
          <li>Stage 0 (Lead Gen) has no deadline — it's the entry point.</li>
          <li>Terminal stages (Closed Won, Closed Lost, Unqualified, Churn) have no deadline.</li>
          <li>Referral and offline leads are excluded from all deadline breaches.</li>
          <li>The deadline resets automatically when a lead moves to a new stage.</li>
        </ul>
      </div>

      <Button onClick={handleSave} loading={saving}>Save Thresholds</Button>
    </div>
  )
}
