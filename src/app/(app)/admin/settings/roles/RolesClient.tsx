'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { Plus, Trash2, GripVertical, Check } from 'lucide-react'

interface Role {
  id?: string
  key: string
  label: string
  level: number
  can_view_team: boolean
  can_transfer_leads: boolean
  can_approve_leads: boolean
  can_access_admin: boolean
  can_request_sla_explanation: boolean
  position: number
}

interface Props {
  orgId: string
  initialRoles: Role[]
}

const PERMISSION_FIELDS: { key: keyof Role; label: string }[] = [
  { key: 'can_view_team',              label: 'View team' },
  { key: 'can_transfer_leads',         label: 'Transfer leads' },
  { key: 'can_approve_leads',          label: 'Approve leads' },
  { key: 'can_access_admin',           label: 'Admin access' },
  { key: 'can_request_sla_explanation', label: 'Request SLA explanation' },
]

export function RolesClient({ orgId, initialRoles }: Props) {
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [saving, setSaving] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const supabase = createClient()

  function updateRole(id: string, patch: Partial<Role>) {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function addRole() {
    const key = `role_${Date.now().toString(36).slice(-5)}`
    const position = roles.length
    const { data, error } = await supabase.from('org_roles').insert({
      org_id: orgId, key, label: 'New Role',
      level: 1, position,
      can_view_team: false, can_transfer_leads: false,
      can_approve_leads: false, can_access_admin: false,
      can_request_sla_explanation: false,
    }).select().single()
    if (error) return toast.error(error.message)
    setRoles(prev => [...prev, data])
  }

  async function saveRole(role: Role) {
    if (!role.id) return
    setSaving(role.id)
    const { error } = await supabase.from('org_roles').update({
      label: role.label, level: role.level,
      can_view_team: role.can_view_team,
      can_transfer_leads: role.can_transfer_leads,
      can_approve_leads: role.can_approve_leads,
      can_access_admin: role.can_access_admin,
      can_request_sla_explanation: role.can_request_sla_explanation,
    }).eq('id', role.id)
    if (error) toast.error(error.message)
    else toast.success('Role saved')
    setSaving(null)
  }

  async function deleteRole(role: Role) {
    if (!role.id) return
    if (!confirm(`Delete role "${role.label}"? Employees with this role won't be affected.`)) return
    const { error } = await supabase.from('org_roles').delete().eq('id', role.id)
    if (error) return toast.error(error.message)
    setRoles(prev => prev.filter(r => r.id !== role.id))
    toast.success('Role deleted')
  }

  async function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return
    const reordered = [...roles]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    const updated = reordered.map((r, i) => ({ ...r, position: i }))
    setRoles(updated)
    setDragIdx(null)
    for (const r of updated) {
      if (r.id) await supabase.from('org_roles').update({ position: r.position }).eq('id', r.id)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">Roles &amp; Permissions</h1>
          <p className="text-[8px] text-brand-400 font-semibold mt-0.5">Define hierarchy levels and access permissions per role</p>
        </div>
        <Button size="sm" onClick={addRole}><Plus size={14} />Add Role</Button>
      </div>

      <div className="space-y-2">
        {roles.map((role, idx) => (
          <div
            key={role.id || role.key}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className={`bg-white border rounded-xl transition-all ${dragIdx === idx ? 'opacity-40' : 'opacity-100'} border-brand-100`}
          >
            <div className="px-4 py-3 space-y-2">
              {/* Row 1: grip + label + key + level + actions */}
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="text-brand-300 cursor-grab flex-shrink-0" />
                <input
                  value={role.label}
                  onChange={e => updateRole(role.id!, { label: e.target.value })}
                  className="flex-1 text-sm font-semibold text-brand-800 bg-transparent border-0 outline-none focus:ring-0 min-w-0"
                  placeholder="Role name"
                />
                <span className="text-xs text-brand-300 font-mono bg-brand-50 px-2 py-0.5 rounded flex-shrink-0">{role.key}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-brand-400">L</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={role.level}
                    onChange={e => updateRole(role.id!, { level: parseInt(e.target.value) || 1 })}
                    className="w-10 text-xs text-center border border-brand-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <button onClick={() => saveRole(role)} className="text-brand-400 hover:text-brand-700 transition-colors flex-shrink-0" title="Save">
                  {saving === role.id
                    ? <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    : <Check size={15} />}
                </button>
                <button onClick={() => deleteRole(role)} className="text-brand-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              {/* Row 2: permission toggles */}
              <div className="flex flex-wrap gap-1.5 pl-6">
                {PERMISSION_FIELDS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateRole(role.id!, { [key]: !role[key] } as Partial<Role>)}
                    className={`text-xs px-2 py-0.5 rounded font-semibold border transition-colors ${
                      role[key]
                        ? 'bg-brand-100 text-brand-700 border-brand-300'
                        : 'bg-white text-brand-400 border-brand-200 hover:border-brand-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {roles.length === 0 && (
          <p className="text-sm text-brand-400 text-center py-8">No roles yet. Add your first role.</p>
        )}
      </div>

      <div className="bg-brand-50 rounded-xl p-4">
        <p className="text-xs text-brand-500 font-semibold mb-2">How hierarchy levels work</p>
        <ul className="text-xs text-brand-400 space-y-1 list-disc list-inside">
          <li>Higher level = more seniority. Level 4 can manage level 3 and below.</li>
          <li>Employees can only be assigned to roles that exist here.</li>
          <li>Deleting a role does not remove it from existing employees — update them manually.</li>
        </ul>
      </div>
    </div>
  )
}
