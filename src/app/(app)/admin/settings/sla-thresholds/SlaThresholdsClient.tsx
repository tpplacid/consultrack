'use client'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useOrgConfig } from '@/context/OrgConfigContext'
import { DEFAULT_SLA_KEY, IG_SIGNAL_SOURCES, type SlaConfig, type SlaConfigBySource } from '@/lib/sla'

function toDaysHours(val: number | null | undefined): { d: number; h: number } {
  if (val == null) return { d: 0, h: 0 }
  const d = Math.floor(val)
  const h = Math.round((val - d) * 24)
  return { d, h }
}

interface Props {
  orgId:             string
  slaConfig:         SlaConfig
  slaConfigBySource: SlaConfigBySource
}

export function SlaThresholdsClient({ orgId, slaConfig: initialDefault, slaConfigBySource: initialBySource }: Props) {
  const { stages, leadSources } = useOrgConfig()
  const slaStages = stages.filter(s => s.sla_days != null && !s.is_won && !s.is_lost)

  const [defaultCfg, setDefaultCfg] = useState<SlaConfig>(initialDefault)
  const [bySource,   setBySource]   = useState<SlaConfigBySource>(initialBySource)
  const [activeKey,  setActiveKey]  = useState<string>(DEFAULT_SLA_KEY)
  const [saving, setSaving]         = useState(false)

  // Source picker shows the org-configured sources (skipping sla_excluded ones
  // — they don't get deadlines so overriding them is a no-op) plus the IG
  // signal sources, which are created by webhook code rather than by admins.
  const sourceOptions = useMemo(() => {
    const sources = [
      { key: DEFAULT_SLA_KEY, label: 'Default (all sources)' },
      ...leadSources.filter(s => !s.sla_excluded).map(s => ({ key: s.key, label: s.label })),
    ]
    for (const ig of IG_SIGNAL_SOURCES) {
      if (!sources.find(s => s.key === ig.key)) sources.push({ key: ig.key, label: ig.label })
    }
    return sources
  }, [leadSources])

  const isDefault   = activeKey === DEFAULT_SLA_KEY
  const activeCfg   = isDefault ? defaultCfg : (bySource[activeKey] ?? {})
  const hasOverride = !isDefault && Object.keys(bySource[activeKey] ?? {}).length > 0

  function setStageValue(stageKey: string, days: number) {
    if (isDefault) {
      setDefaultCfg(prev => ({ ...prev, [stageKey]: days }))
    } else {
      setBySource(prev => ({ ...prev, [activeKey]: { ...(prev[activeKey] ?? {}), [stageKey]: days } }))
    }
  }

  function clearOverride() {
    if (isDefault) return
    setBySource(prev => {
      const next = { ...prev }
      delete next[activeKey]
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('orgs').update({
      sla_config:           defaultCfg,
      sla_config_by_source: bySource,
    }).eq('id', orgId)
    if (error) toast.error(error.message)
    else toast.success('Deadline thresholds saved')
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Deadline Thresholds</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set how long a lead can stay at each stage before a deadline breach is triggered.
          Override per source for channels that need faster (or slower) follow-up — IG DMs
          might need 30 minutes; offline referrals are excluded entirely.
        </p>
      </div>

      {/* Source picker */}
      <div className="flex flex-wrap gap-2">
        {sourceOptions.map(opt => {
          const active = opt.key === activeKey
          const customised = opt.key !== DEFAULT_SLA_KEY && Object.keys(bySource[opt.key] ?? {}).length > 0
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveKey(opt.key)}
              className={
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ' +
                (active
                  ? 'bg-brand-800 text-white border-brand-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')
              }
            >
              {opt.label}
              {customised && !active && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
            </button>
          )
        })}
      </div>

      {!isDefault && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start justify-between gap-4">
          <p>
            Overrides apply only to <strong>{sourceOptions.find(o => o.key === activeKey)?.label}</strong>.
            Stages you don&rsquo;t set fall back to the default thresholds.
          </p>
          {hasOverride && (
            <button onClick={clearOverride} className="text-blue-700 underline whitespace-nowrap font-medium">
              Reset to default
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {slaStages.map(s => {
          const overrideVal = activeCfg[s.key]
          const fallbackVal = isDefault ? (s.sla_days ?? null) : (defaultCfg[s.key] ?? s.sla_days ?? null)
          const val = overrideVal ?? fallbackVal
          const { d, h } = toDaysHours(val)
          const usingFallback = !isDefault && overrideVal == null
          return (
            <div key={s.key} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                {usingFallback && (
                  <p className="text-[10px] text-slate-400 mt-0.5">Using default ({fallbackVal ?? 0}d)</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={d}
                  onChange={e => setStageValue(s.key, (parseInt(e.target.value) || 0) + h / 24)}
                  className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <span className="text-sm text-slate-500">d</span>
                <input type="number" min={0} max={23} value={h}
                  onChange={e => setStageValue(s.key, d + (parseInt(e.target.value) || 0) / 24)}
                  className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <span className="text-sm text-slate-500">h</span>
              </div>
            </div>
          )
        })}
        {slaStages.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-400">No stages with deadlines configured. Set deadline days in Settings → Pipeline.</p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Note</p>
        <ul className="space-y-1 text-xs list-disc list-inside">
          <li>Entry and terminal stages have no deadline.</li>
          <li>Sources marked <em>excluded</em> in lead sources (referral, offline by default) skip deadlines entirely.</li>
          <li>The deadline resets automatically when a lead moves to a new stage.</li>
          <li>Minimum override granularity is 1 hour (set days = 0, hours = 1+). Sub-hour SLAs (e.g. 30 min) are not supported in this UI.</li>
        </ul>
      </div>

      <Button onClick={handleSave} loading={saving}>Save Thresholds</Button>
    </div>
  )
}
