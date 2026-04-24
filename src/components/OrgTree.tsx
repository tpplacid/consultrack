'use client'

import { useState } from 'react'
import { Employee, ROLE_LABELS } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight, Users, Star } from 'lucide-react'

interface OrgNode extends Employee {
  children: OrgNode[]
  leadCount?: number
  activityCount?: number
}

interface Props {
  employees: Employee[]
  leadCounts: Record<string, number>
  activityCounts: Record<string, number>
  onScoreUpdate: (id: string, score: number) => void
}

function buildTree(employees: Employee[]): OrgNode[] {
  const map: Record<string, OrgNode> = {}
  for (const e of employees) {
    map[e.id] = { ...e, children: [] }
  }
  const roots: OrgNode[] = []
  for (const e of employees) {
    if (e.reports_to && map[e.reports_to]) {
      map[e.reports_to].children.push(map[e.id])
    } else {
      roots.push(map[e.id])
    }
  }
  return roots
}

function TreeNode({ node, depth, leadCounts, activityCounts, onScoreUpdate, allEmployees }: {
  node: OrgNode
  depth: number
  leadCounts: Record<string, number>
  activityCounts: Record<string, number>
  onScoreUpdate: (id: string, score: number) => void
  allEmployees: Employee[]
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [editScore, setEditScore] = useState(false)
  const [scoreVal, setScoreVal] = useState(String(node.score))
  const [saving, setSaving] = useState(false)

  const leads = leadCounts[node.id] || 0
  const activities = activityCounts[node.id] || 0
  const flagged = activities < 2

  async function saveScore() {
    const s = parseInt(scoreVal)
    if (isNaN(s) || s < 1 || s > 10) return toast.error('Score must be 1–10')
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('employees').update({ score: s }).eq('id', node.id)
    if (error) toast.error(error.message)
    else { onScoreUpdate(node.id, s); toast.success('Score updated') }
    setSaving(false)
    setEditScore(false)
  }

  const roleColors: Record<string, string> = {
    ad: 'bg-purple-100 text-purple-700',
    tl: 'bg-blue-100 text-blue-700',
    counsellor: 'bg-green-100 text-green-700',
    telesales: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-slate-200 pl-4' : ''}`}>
      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all mb-2 ${flagged ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
        {/* Expand toggle */}
        {node.children.length > 0 ? (
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : <div className="w-4 flex-shrink-0" />}

        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${roleColors[node.role] || 'bg-slate-100 text-slate-600'}`}>
          {getInitials(node.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{node.name}</p>
          <p className="text-xs text-slate-500">{ROLE_LABELS[node.role]} • {node.email}</p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{leads} leads</span>
          </div>
          <div className={`${flagged ? 'text-red-500 font-medium' : ''}`}>
            {activities} act.
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star size={12} className="text-amber-400" />
          {editScore ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={10}
                value={scoreVal}
                onChange={e => setScoreVal(e.target.value)}
                className="w-12 px-1 py-0.5 border border-slate-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={e => e.key === 'Enter' && saveScore()}
              />
              <button onClick={saveScore} disabled={saving} className="text-xs text-indigo-600 hover:underline disabled:opacity-50">Save</button>
              <button onClick={() => setEditScore(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditScore(true)} className="text-xs text-slate-600 hover:text-indigo-600 font-medium">
              {node.score}/10
            </button>
          )}
        </div>
      </div>

      {expanded && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          leadCounts={leadCounts}
          activityCounts={activityCounts}
          onScoreUpdate={onScoreUpdate}
          allEmployees={allEmployees}
        />
      ))}
    </div>
  )
}

export function OrgTree({ employees: initialEmployees, leadCounts, activityCounts, onScoreUpdate }: Props) {
  const [employees, setEmployees] = useState(initialEmployees)

  function handleScoreUpdate(id: string, score: number) {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, score } : e))
    onScoreUpdate(id, score)
  }

  const tree = buildTree(employees)

  return (
    <div className="space-y-2">
      {tree.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          leadCounts={leadCounts}
          activityCounts={activityCounts}
          onScoreUpdate={handleScoreUpdate}
          allEmployees={employees}
        />
      ))}
      {tree.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No employees yet</p>}
    </div>
  )
}
