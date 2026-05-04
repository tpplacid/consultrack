'use client'

import { useState } from 'react'
import { SectionLayout, FieldDef, FieldType, labelToKey, STANDARD_SECTIONS } from '@/lib/fieldLayouts'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  Type, Hash, IndianRupee, Calendar, List, CheckSquare, Phone, Mail,
  Link, AlignLeft, Calculator, Edit3, Check, X,
} from 'lucide-react'

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: 'text',     label: 'Text',        icon: <Type size={13} />,         hint: 'Single-line text' },
  { value: 'textarea', label: 'Long text',   icon: <AlignLeft size={13} />,    hint: 'Multi-line text' },
  { value: 'number',   label: 'Number',      icon: <Hash size={13} />,         hint: 'Numeric value' },
  { value: 'currency', label: 'Revenue (₹)', icon: <IndianRupee size={13} />,  hint: 'Currency field — counts toward total revenue in analytics' },
  { value: 'date',     label: 'Date',        icon: <Calendar size={13} />,     hint: 'Date picker' },
  { value: 'select',   label: 'Dropdown',    icon: <List size={13} />,         hint: 'Pick from options' },
  { value: 'boolean',  label: 'Yes / No',    icon: <CheckSquare size={13} />,  hint: 'Toggle' },
  { value: 'phone',    label: 'Phone',       icon: <Phone size={13} />,        hint: 'Phone number' },
  { value: 'email',    label: 'Email',       icon: <Mail size={13} />,         hint: 'Email address' },
  { value: 'url',      label: 'URL',         icon: <Link size={13} />,         hint: 'Web link' },
  { value: 'formula',  label: 'Formula',     icon: <Calculator size={13} />,   hint: 'Computed from other fields' },
]

function typeIcon(t: FieldType) {
  return FIELD_TYPES.find(f => f.value === t)?.icon ?? <Type size={13} />
}

function newField(position: number): FieldDef {
  return {
    id: crypto.randomUUID(),
    key: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    formula: '',
    position,
  }
}

interface FieldEditorProps {
  field: FieldDef
  allFields: FieldDef[]    // for formula hints
  onChange: (f: FieldDef) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}

function FieldEditor({ field, allFields, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: FieldEditorProps) {
  const [expanded, setExpanded] = useState(!field.label)
  const [optionInput, setOptionInput] = useState('')

  function set<K extends keyof FieldDef>(k: K, v: FieldDef[K]) {
    const updated = { ...field, [k]: v }
    // Auto-generate key from label if key is still empty or was auto-generated
    if (k === 'label' && typeof v === 'string') {
      const autoKey = labelToKey(v)
      if (!field.key || field.key === labelToKey(field.label)) {
        updated.key = autoKey
      }
    }
    onChange(updated)
  }

  function addOption() {
    const o = optionInput.trim()
    if (!o || field.options.includes(o)) return
    set('options', [...field.options, o])
    setOptionInput('')
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
        <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
        <div className="flex items-center gap-1.5 text-slate-500 flex-shrink-0">
          {typeIcon(field.type)}
        </div>
        <p className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">
          {field.label || <span className="text-slate-400 italic">New field</span>}
        </p>
        {field.required && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 border border-red-200 rounded font-semibold flex-shrink-0">Required</span>
        )}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition">
            <ChevronDown size={14} />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-1 text-slate-400 hover:text-brand-600 transition">
            <Edit3 size={13} />
          </button>
          <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500 transition">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Editor body */}
      {expanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Label *</label>
              <input
                value={field.label}
                onChange={e => set('label', e.target.value)}
                placeholder="e.g. Passport Number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Field key (auto)</label>
              <input
                value={field.key}
                onChange={e => set('key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="passport_number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={field.type}
                onChange={e => set('type', e.target.value as FieldType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label} — {t.hint}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Placeholder</label>
              <input
                value={field.placeholder}
                onChange={e => set('placeholder', e.target.value)}
                placeholder="Hint shown in empty field"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={field.required}
              onChange={e => set('required', e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-slate-700">Required field</span>
          </label>

          {/* Dropdown options */}
          {field.type === 'select' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Options</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {field.options.map(o => (
                  <span key={o} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700">
                    {o}
                    <button onClick={() => set('options', field.options.filter(x => x !== o))} className="text-slate-400 hover:text-red-500 transition">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Type option and press Enter"
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button onClick={addOption} className="px-3 py-1.5 bg-brand-800 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition">
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Formula */}
          {field.type === 'formula' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Formula</label>
              <input
                value={field.formula}
                onChange={e => set('formula', e.target.value)}
                placeholder="e.g. {deposit_amount} + {booking_fee}"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <p className="text-xs text-slate-500 mt-1">
                Reference other number fields using {'{'}<span className="font-mono">field_key</span>{'}'}. Supports + − × ÷ and parentheses.
              </p>
              {allFields.filter(f => f.type === 'number' && f.key && f.id !== field.id).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-xs text-slate-500">Available:</span>
                  {allFields.filter(f => f.type === 'number' && f.key && f.id !== field.id).map(f => (
                    <button
                      key={f.id}
                      onClick={() => set('formula', field.formula + `{${f.key}}`)}
                      className="text-xs px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition"
                    >
                      {'{' + f.key + '}'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setExpanded(false)} className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1 transition">
            <Check size={12} /> Done
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props { initialSections: SectionLayout[] }

export function LayoutsClient({ initialSections }: Props) {
  const [sections, setSections] = useState<SectionLayout[]>(initialSections)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [seeding, setSeeding] = useState(false)

  // ── Section CRUD ──────────────────────────────────────────────────────────

  async function seedDefaults() {
    setSeeding(true)
    const created: SectionLayout[] = []
    for (let i = 0; i < STANDARD_SECTIONS.length; i++) {
      const s = STANDARD_SECTIONS[i]
      const fieldsWithIds: FieldDef[] = s.fields.map(f => ({ ...f, id: crypto.randomUUID() }))
      const res = await fetch('/api/org-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_name: s.section_name, position: i }),
      })
      if (!res.ok) { toast.error(`Failed to create section "${s.section_name}"`); continue }
      const { section } = await res.json()
      const patchRes = await fetch(`/api/org-layouts/${section.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsWithIds }),
      })
      if (patchRes.ok) {
        const { section: saved } = await patchRes.json()
        created.push(saved)
      }
    }
    setSections(created)
    toast.success('Standard lead fields loaded — customise them to fit your process')
    setSeeding(false)
  }

  async function addSection() {
    const res = await fetch('/api/org-layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_name: 'New Section', position: sections.length }),
    })
    if (!res.ok) { toast.error('Failed to create section'); return }
    const { section } = await res.json()
    setSections(prev => [...prev, section])
  }

  async function deleteSection(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/org-layouts/${id}`, { method: 'DELETE' })
    if (res.ok) setSections(prev => prev.filter(s => s.id !== id))
    else toast.error('Failed to delete section')
    setDeleting(null)
  }

  async function saveSection(section: SectionLayout) {
    setSaving(section.id)
    const res = await fetch(`/api/org-layouts/${section.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section_name: section.section_name,
        fields: section.fields,
        position: section.position,
      }),
    })
    if (!res.ok) toast.error('Failed to save')
    else toast.success('Section saved')
    setSaving(null)
  }

  function updateSection(id: string, patch: Partial<SectionLayout>) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  async function moveSection(id: string, dir: 'up' | 'down') {
    const idx = sections.findIndex(s => s.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === sections.length - 1) return
    const next = [...sections]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    const reindexed = next.map((s, i) => ({ ...s, position: i }))
    setSections(reindexed)
    // Persist both swapped sections
    await Promise.all([
      fetch(`/api/org-layouts/${reindexed[idx].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: reindexed[idx].position }) }),
      fetch(`/api/org-layouts/${reindexed[swap].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: reindexed[swap].position }) }),
    ])
  }

  // ── Field CRUD ────────────────────────────────────────────────────────────

  function addField(sectionId: string) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, fields: [...s.fields, newField(s.fields.length)] }
    }))
  }

  function updateField(sectionId: string, fieldId: string, updated: FieldDef) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, fields: s.fields.map(f => f.id === fieldId ? updated : f) }
    }))
  }

  function deleteField(sectionId: string, fieldId: string) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, fields: s.fields.filter(f => f.id !== fieldId).map((f, i) => ({ ...f, position: i })) }
    }))
  }

  function moveField(sectionId: string, fieldId: string, dir: 'up' | 'down') {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const idx = s.fields.findIndex(f => f.id === fieldId)
      if (dir === 'up' && idx === 0) return s
      if (dir === 'down' && idx === s.fields.length - 1) return s
      const next = [...s.fields]
      const swap = dir === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return { ...s, fields: next.map((f, i) => ({ ...f, position: i })) }
    }))
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-800">Lead Layout</h1>
          <p className="text-[8px] text-brand-400 font-semibold mt-0.5">Define custom sections and fields that appear on every lead for this organisation</p>
        </div>
        <button
          onClick={addSection}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-700 text-white rounded-lg text-sm font-bold transition"
        >
          <Plus size={14} /> Add Section
        </button>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-slate-200">
          <Calculator size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500 mb-1">No custom sections yet</p>
          <p className="text-xs text-slate-400 mb-5">Start from the standard lead fields template, or build your own from scratch</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-800 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition disabled:opacity-60"
            >
              {seeding ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Calculator size={14} />
              )}
              Start with defaults
            </button>
            <button onClick={addSection} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition">
              <Plus size={14} /> Build from scratch
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Standard fields include Lead Information, Parent & Financial, and Payments sections</p>
        </div>
      )}

      {sections.map((section, sIdx) => (
        <div key={section.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Section header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-brand-800 border-b border-brand-700">
            <GripVertical size={15} className="text-brand-400 flex-shrink-0" />

            {editingName === section.id ? (
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    updateSection(section.id, { section_name: nameInput || 'Section' })
                    setEditingName(null)
                  }
                  if (e.key === 'Escape') setEditingName(null)
                }}
                onBlur={() => {
                  updateSection(section.id, { section_name: nameInput || 'Section' })
                  setEditingName(null)
                }}
                className="flex-1 bg-brand-700 border border-brand-500 rounded px-2 py-1 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white/40"
              />
            ) : (
              <button
                className="flex-1 text-left text-sm font-semibold text-white hover:text-brand-200 transition"
                onClick={() => { setEditingName(section.id); setNameInput(section.section_name) }}
              >
                {section.section_name}
                <Edit3 size={11} className="inline ml-1.5 text-brand-400" />
              </button>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => moveSection(section.id, 'up')} disabled={sIdx === 0} className="p-1 text-brand-400 hover:text-white disabled:opacity-30 transition">
                <ChevronUp size={14} />
              </button>
              <button onClick={() => moveSection(section.id, 'down')} disabled={sIdx === sections.length - 1} className="p-1 text-brand-400 hover:text-white disabled:opacity-30 transition">
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => deleteSection(section.id)}
                disabled={deleting === section.id}
                className="p-1 text-brand-400 hover:text-red-400 transition disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="p-4 space-y-3">
            {section.fields.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No fields yet — add one below</p>
            )}

            {section.fields.map((field, fIdx) => (
              <FieldEditor
                key={field.id}
                field={field}
                allFields={section.fields}
                onChange={updated => updateField(section.id, field.id, updated)}
                onDelete={() => deleteField(section.id, field.id)}
                onMoveUp={() => moveField(section.id, field.id, 'up')}
                onMoveDown={() => moveField(section.id, field.id, 'down')}
                isFirst={fIdx === 0}
                isLast={fIdx === section.fields.length - 1}
              />
            ))}

            <button
              onClick={() => addField(section.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600 transition"
            >
              <Plus size={13} /> Add field
            </button>
          </div>

          {/* Section footer — save */}
          <div className="px-4 pb-4 flex justify-end">
            <button
              onClick={() => saveSection(section)}
              disabled={saving === section.id}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
            >
              {saving === section.id ? 'Saving…' : 'Save section'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
