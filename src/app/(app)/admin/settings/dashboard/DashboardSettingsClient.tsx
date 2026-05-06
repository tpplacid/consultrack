'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, LayoutDashboard, X, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { useOrgConfig } from '@/context/OrgConfigContext'
import { DashboardCard, describeCard } from '@/lib/dashboardCards'

interface Stage { key: string; label: string; is_lost: boolean; is_won: boolean; position: number }

interface Props {
  orgId:           string
  stages:          Stage[]
  currencyDefs:    { key: string; label: string }[]
  orgRoles:        { key: string; label: string }[]
  initialCards:    DashboardCard[]
  legacyStageKeys: string[]
  configured:      boolean
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function DashboardSettingsClient({
  orgId, stages, currencyDefs, orgRoles, initialCards, legacyStageKeys, configured,
}: Props) {
  const { leadSources } = useOrgConfig()
  const stageMap = useMemo(() => Object.fromEntries(stages.map(s => [s.key, s])), [stages])

  // Seed only when the org has NEVER explicitly saved here. Once
  // configured = true, we honour whatever they saved (including an
  // intentional empty list) instead of overwriting their choice on
  // every settings revisit.
  const seeded: DashboardCard[] = useMemo(() => {
    if (configured) return initialCards
    const seed: DashboardCard[] = [
      { id: uid(), label: 'Total Leads', metric: { type: 'count' } },
      ...legacyStageKeys.map(k => ({
        id:     uid(),
        label:  stageMap[k]?.label ?? k,
        metric: { type: 'count' as const },
        filter: { stages: [k] },
      })),
    ]
    if (currencyDefs.length > 0) {
      seed.push({
        id: uid(),
        label: 'Total Revenue',
        metric: { type: 'sum', field: currencyDefs[0].key },
      })
    }
    return seed
  }, [configured, initialCards, legacyStageKeys, stageMap, currencyDefs])

  const [cards, setCards] = useState<DashboardCard[]>(seeded)
  const [saving, setSaving] = useState(false)

  function update(id: string, patch: Partial<DashboardCard>) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  function updateFilter(id: string, key: keyof NonNullable<DashboardCard['filter']>, values: string[]) {
    setCards(prev => prev.map(c => {
      if (c.id !== id) return c
      const nextFilter = { ...(c.filter ?? {}) }
      if (values.length === 0) delete nextFilter[key]
      else nextFilter[key] = values
      const cleaned = Object.keys(nextFilter).length === 0 ? undefined : nextFilter
      return { ...c, filter: cleaned }
    }))
  }
  function add() {
    setCards(prev => [...prev, { id: uid(), label: 'New card', metric: { type: 'count' } }])
  }
  function remove(id: string) {
    setCards(prev => prev.filter(c => c.id !== id))
  }
  function move(id: string, dir: -1 | 1) {
    setCards(prev => {
      const i = prev.findIndex(c => c.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function save() {
    // No "minimum 1 card" check — empty list is valid (dashboard renders no
    // headline cards, just the lead grid). Admins can opt out cleanly.
    // Always set dashboard_cards_configured = true so subsequent visits
    // honour the saved list (even when empty) instead of re-seeding.
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('orgs')
      .update({ dashboard_cards: cards, dashboard_cards_configured: true })
      .eq('id', orgId)
    if (error) toast.error(error.message)
    else toast.success('Dashboard cards saved')
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-800 flex items-center gap-2">
          <LayoutDashboard size={18} />
          Dashboard Cards
        </h1>
        <p className="text-[11px] text-brand-500 mt-1 leading-relaxed">
          Define the headline cards your team sees on the dashboard. Each card
          counts leads (or sums a currency field) and can be filtered by stage,
          source, or owner role — pick zero or many of each.
        </p>
      </div>

      {cards.length === 0 && (
        <div className="bg-white rounded-2xl border border-brand-100 p-6 text-center text-sm text-brand-500">
          No cards configured. Click <strong>Add card</strong> below to create one — or save the empty list to hide the headline row entirely.
        </div>
      )}

      <div className="space-y-3">
        {cards.map((card, i) => (
          <CardEditor
            key={card.id}
            card={card}
            index={i}
            total={cards.length}
            stages={stages}
            sources={leadSources}
            roles={orgRoles}
            currencyDefs={currencyDefs}
            onChange={patch => update(card.id, patch)}
            onFilterChange={(key, values) => updateFilter(card.id, key, values)}
            onMove={dir => move(card.id, dir)}
            onRemove={() => remove(card.id)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={add}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors">
          <Plus size={13} />
          Add card
        </button>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-brand-800 hover:bg-brand-900 text-white transition-colors disabled:opacity-60">
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

interface CardEditorProps {
  card:           DashboardCard
  index:          number
  total:          number
  stages:         Stage[]
  sources:        { key: string; label: string }[]
  roles:          { key: string; label: string }[]
  currencyDefs:   { key: string; label: string }[]
  onChange:       (patch: Partial<DashboardCard>) => void
  onFilterChange: (key: 'stages' | 'sources' | 'owner_roles', values: string[]) => void
  onMove:         (dir: -1 | 1) => void
  onRemove:       () => void
}

function CardEditor({ card, index, total, stages, sources, roles, currencyDefs, onChange, onFilterChange, onMove, onRemove }: CardEditorProps) {
  const isCount     = card.metric.type === 'count'
  const filter      = card.filter ?? {}
  const sumField    = card.metric.type === 'sum' ? card.metric.field : ''

  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-4 space-y-3">
      {/* Top row: reorder + label + remove */}
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="text-brand-400 hover:text-brand-700 disabled:opacity-20"><ChevronUp size={14} /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="text-brand-400 hover:text-brand-700 disabled:opacity-20"><ChevronDown size={14} /></button>
        </div>
        <input
          value={card.label}
          onChange={e => onChange({ label: e.target.value })}
          placeholder="Card label"
          className="flex-1 px-3 py-1.5 border border-brand-100 rounded-lg text-sm font-semibold text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button onClick={onRemove}
          className="text-brand-400 hover:text-red-500 transition-colors p-1.5 rounded">
          <X size={14} />
        </button>
      </div>

      {/* Metric picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-brand-400 font-semibold">Metric</span>
        <button
          onClick={() => onChange({ metric: { type: 'count' } })}
          className={'px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ' +
            (isCount ? 'bg-brand-800 text-white border-brand-800' : 'bg-white text-brand-600 border-brand-200 hover:border-brand-300')}>
          Count
        </button>
        {currencyDefs.map(c => {
          const active = !isCount && sumField === c.key
          return (
            <button key={c.key}
              onClick={() => onChange({ metric: { type: 'sum', field: c.key } })}
              className={'px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ' +
                (active ? 'bg-brand-800 text-white border-brand-800' : 'bg-white text-brand-600 border-brand-200 hover:border-brand-300')}>
              Sum: {c.label}
            </button>
          )
        })}
        {currencyDefs.length === 0 && !isCount && (
          <span className="text-[10px] text-amber-700">Add a currency field in Pipeline → Fields to enable sum metrics</span>
        )}
      </div>

      {/* Filters */}
      <FilterSection
        title="Stages" hint="Which pipeline stages to include (any selected)"
        options={stages.map(s => ({ key: s.key, label: s.label }))}
        selected={filter.stages ?? []}
        onChange={vs => onFilterChange('stages', vs)}
      />
      <FilterSection
        title="Sources" hint="Which lead sources to include"
        options={sources.map(s => ({ key: s.key, label: s.label }))}
        selected={filter.sources ?? []}
        onChange={vs => onFilterChange('sources', vs)}
      />
      <FilterSection
        title="Owner role" hint="Restrict to leads owned by these roles"
        options={roles.length > 0 ? roles : [
          { key: 'tl', label: 'Team Lead' },
          { key: 'counsellor', label: 'Counsellor' },
          { key: 'telesales', label: 'Telesales' },
        ]}
        selected={filter.owner_roles ?? []}
        onChange={vs => onFilterChange('owner_roles', vs)}
      />

      <p className="text-[10px] text-brand-400 italic pl-1">{describeCard(card)}</p>
    </div>
  )
}

function FilterSection({ title, hint, options, selected, onChange }: {
  title:    string
  hint:     string
  options:  { key: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(k: string) {
    onChange(selected.includes(k) ? selected.filter(x => x !== k) : [...selected, k])
  }
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-wide text-brand-400 font-semibold">{title}</span>
        <span className="text-[10px] text-brand-400">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const active = selected.includes(o.key)
          return (
            <button key={o.key} onClick={() => toggle(o.key)}
              className={'px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ' +
                (active ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300')}>
              {o.label}
            </button>
          )
        })}
        {options.length === 0 && (
          <span className="text-[10px] text-brand-400 italic">No options configured</span>
        )}
      </div>
    </div>
  )
}
