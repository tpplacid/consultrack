'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lead, Activity, Employee, WaTemplate, LeadStage, SUB_STAGES, STAGE_LABELS, STAGE_A_TO_B_REQUIRED } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { StageBadge } from '@/components/leads/StageBadge'
import { WaTemplateModal } from '@/components/leads/WaTemplateModal'
import { formatDateTime, timeAgo, isOverdue } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Phone, MessageSquare, Clock, ArrowLeft,
  AlertTriangle, Save, ArrowRightLeft
} from 'lucide-react'

interface Props {
  lead: Lead
  activities: Activity[]
  templates: WaTemplate[]
  employee: Employee
  orgEmployees: Employee[]
}

const ALL_STAGES: LeadStage[] = ['0','A','B','C','D','E','F','G','X','Y']

export function LeadDetailClient({ lead: initialLead, activities: initialActivities, templates, employee, orgEmployees }: Props) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [activities, setActivities] = useState(initialActivities)
  const [saving, setSaving] = useState(false)
  const [waOpen, setWaOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [comment, setComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

  // Editable fields
  const [stageDraft, setStageDraft] = useState(lead.main_stage)
  const [subStageDraft, setSubStageDraft] = useState(lead.sub_stage || '')
  const [followupDraft, setFollowupDraft] = useState(lead.next_followup_at ? lead.next_followup_at.slice(0, 16) : '')
  const [fields, setFields] = useState({
    lead_type: lead.lead_type || '',
    location: lead.location || '',
    twelfth_score: lead.twelfth_score?.toString() || '',
    preferred_course: lead.preferred_course || '',
    interested_colleges: lead.interested_colleges?.join(', ') || '',
    alternate_courses: lead.alternate_courses?.join(', ') || '',
    father_phone: lead.father_phone || '',
    decision_maker: lead.decision_maker || '',
    income_status: lead.income_status || '',
    loan_status: lead.loan_status || '',
  })

  const supabase = createClient()

  // Realtime activity updates
  useEffect(() => {
    const channel = supabase
      .channel(`lead-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities', filter: `lead_id=eq.${lead.id}` }, (payload) => {
        setActivities(prev => [payload.new as Activity, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [lead.id])

  function validateStageTransition(from: LeadStage, to: LeadStage): string | null {
    if (from === 'A' && to === 'B') {
      const missing = STAGE_A_TO_B_REQUIRED.filter(f => !fields[f as keyof typeof fields])
      if (missing.length > 0) return `Fill required fields before moving to B: ${missing.join(', ')}`
      if (!fields.interested_colleges) return 'At least one interested college required'
    }
    return null
  }

  async function handleSave() {
    setSaving(true)
    const updates: Record<string, unknown> = {
      lead_type: fields.lead_type || null,
      location: fields.location || null,
      twelfth_score: fields.twelfth_score ? parseInt(fields.twelfth_score) : null,
      preferred_course: fields.preferred_course || null,
      interested_colleges: fields.interested_colleges ? fields.interested_colleges.split(',').map(s => s.trim()).filter(Boolean) : [],
      alternate_courses: fields.alternate_courses ? fields.alternate_courses.split(',').map(s => s.trim()).filter(Boolean) : [],
      father_phone: fields.father_phone || null,
      decision_maker: fields.decision_maker || null,
      income_status: fields.income_status || null,
      loan_status: fields.loan_status || null,
      next_followup_at: followupDraft || null,
      sub_stage: subStageDraft || null,
    }

    // Stage change
    if (stageDraft !== lead.main_stage) {
      const err = validateStageTransition(lead.main_stage, stageDraft)
      if (err) { toast.error(err); setSaving(false); return }
      updates.main_stage = stageDraft

      await supabase.from('activities').insert({
        org_id: lead.org_id, lead_id: lead.id, employee_id: employee.id,
        activity_type: 'stage_change',
        stage_from: lead.main_stage, stage_to: stageDraft,
        note: `Stage changed from ${lead.main_stage} to ${stageDraft}`,
      })
    } else {
      // Field update
      await supabase.from('activities').insert({
        org_id: lead.org_id, lead_id: lead.id, employee_id: employee.id,
        activity_type: 'field_update',
        note: 'Lead fields updated',
      })
    }

    const { data: updated, error } = await supabase.from('leads').update(updates).eq('id', lead.id).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    setLead(updated)
    toast.success('Lead updated')
    setSaving(false)
  }

  async function handleTransfer() {
    if (!transferTarget) return
    setTransferring(true)
    const emp = orgEmployees.find(e => e.id === transferTarget)
    const { error } = await supabase
      .from('leads')
      .update({ owner_id: transferTarget, reporting_manager_id: emp?.reports_to || null })
      .eq('id', lead.id)
    if (error) toast.error(error.message)
    else {
      await supabase.from('activities').insert({
        org_id: lead.org_id, lead_id: lead.id, employee_id: employee.id,
        activity_type: 'field_update', note: `Lead transferred to ${emp?.name}`,
      })
      toast.success(`Lead transferred to ${emp?.name}`)
      router.refresh()
      setTransferOpen(false)
    }
    setTransferring(false)
  }

  async function handleAddComment() {
    if (!comment.trim()) return
    setAddingComment(true)
    const { error } = await supabase.from('activities').insert({
      org_id: lead.org_id, lead_id: lead.id, employee_id: employee.id,
      activity_type: 'comment', note: comment,
    })
    if (error) toast.error(error.message)
    else { setComment(''); toast.success('Comment added') }
    setAddingComment(false)
  }

  const overdue = isOverdue(lead.sla_deadline)
  const subStageOptions = SUB_STAGES[stageDraft] || []

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{lead.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Phone size={13} />
              <a href={`tel:${lead.phone}`} className="hover:text-indigo-600">{lead.phone}</a>
            </div>
            <StageBadge stage={lead.main_stage} />
            {overdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle size={12} />
                SLA Overdue
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(employee.role === 'tl' || employee.role === 'ad') && (
            <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft size={14} />
              Transfer
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setWaOpen(true)}>
            <MessageSquare size={14} />
            WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lead details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stage & SLA */}
          <Card>
            <CardHeader>
              <CardTitle>Stage & Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Stage</label>
                  <select
                    value={stageDraft}
                    onChange={e => { setStageDraft(e.target.value as LeadStage); setSubStageDraft('') }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {ALL_STAGES.map(s => <option key={s} value={s}>{s} — {STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
                {subStageOptions.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">Sub-stage</label>
                    <select
                      value={subStageDraft}
                      onChange={e => setSubStageDraft(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select sub-stage</option>
                      {subStageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {lead.sla_deadline && (
                  <div className={`p-3 rounded-lg ${overdue ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
                    <p className="text-xs font-medium text-slate-500 mb-1">SLA Deadline</p>
                    <p className={`font-semibold ${overdue ? 'text-red-600' : 'text-slate-700'}`}>{formatDateTime(lead.sla_deadline)}</p>
                  </div>
                )}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">Stage Entered</p>
                  <p className="font-semibold text-slate-700">{formatDateTime(lead.stage_entered_at)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Next Follow-up</label>
                <input
                  type="datetime-local"
                  value={followupDraft}
                  onChange={e => setFollowupDraft(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lead Info */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lead Type" value={fields.lead_type} onChange={e => setFields(p => ({...p, lead_type: e.target.value}))} placeholder="Engineering, Medical…" />
                <Input label="Location / City" value={fields.location} onChange={e => setFields(p => ({...p, location: e.target.value}))} placeholder="Chennai" />
                <Input label="12th Score (%)" type="number" value={fields.twelfth_score} onChange={e => setFields(p => ({...p, twelfth_score: e.target.value}))} placeholder="85" />
                <Input label="Preferred Course" value={fields.preferred_course} onChange={e => setFields(p => ({...p, preferred_course: e.target.value}))} placeholder="B.Tech CSE" />
              </div>
              <Input label="Interested Colleges (comma-separated, min 1)" value={fields.interested_colleges} onChange={e => setFields(p => ({...p, interested_colleges: e.target.value}))} placeholder="SRM, VIT, Amrita" />
              <Input label="Alternate Courses (comma-separated)" value={fields.alternate_courses} onChange={e => setFields(p => ({...p, alternate_courses: e.target.value}))} placeholder="B.Sc Physics, BCA" />
            </CardContent>
          </Card>

          {/* Parent & Financial */}
          <Card>
            <CardHeader><CardTitle>Parent & Financial</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Father Phone" value={fields.father_phone} onChange={e => setFields(p => ({...p, father_phone: e.target.value}))} placeholder="+91 9XXXXXXXXX" />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Decision Maker</label>
                  <select value={fields.decision_maker} onChange={e => setFields(p => ({...p, decision_maker: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select…</option>
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="sibling">Sibling</option>
                    <option value="relative">Relative</option>
                  </select>
                </div>
                <Input label="Income Status" value={fields.income_status} onChange={e => setFields(p => ({...p, income_status: e.target.value}))} placeholder="e.g. Below 5L" />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Loan Needed</label>
                  <select value={fields.loan_status} onChange={e => setFields(p => ({...p, loan_status: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button onClick={handleSave} loading={saving} className="w-full">
            <Save size={15} />
            Save Changes
          </Button>

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle>Add Comment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Add a note, call log, or update…"
              />
              <Button size="sm" onClick={handleAddComment} loading={addingComment} disabled={!comment.trim()}>
                Add Comment
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Activity + Meta */}
        <div className="space-y-4">
          {/* Owner info */}
          <Card>
            <CardHeader><CardTitle>Ownership</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 font-medium">Owner</p>
                <p className="font-medium text-slate-800">{(lead.owner as Employee)?.name || '—'}</p>
                <p className="text-xs text-slate-500 capitalize">{(lead.owner as Employee)?.role}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Reporting Manager</p>
                <p className="font-medium text-slate-800">{(lead.reporting_manager as Employee)?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Source</p>
                <p className="font-medium text-slate-800 capitalize">{lead.source}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Created</p>
                <p className="font-medium text-slate-800">{timeAgo(lead.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {activities.length === 0 ? (
                <div className="p-4 text-sm text-slate-400 text-center">No activities yet</div>
              ) : activities.map(act => (
                <div key={act.id} className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-indigo-600 text-xs font-bold">
                        {(act.employee as Employee)?.name?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-700">{(act.employee as Employee)?.name}</p>
                        <p className="text-xs text-slate-400 flex-shrink-0">{timeAgo(act.created_at)}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{act.activity_type.replace('_', ' ')}</p>
                      {act.note && <p className="text-sm text-slate-700 mt-1">{act.note}</p>}
                      {act.stage_from && act.stage_to && (
                        <p className="text-xs text-indigo-600 mt-1">
                          Stage: {act.stage_from} → {act.stage_to}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <WaTemplateModal
        open={waOpen}
        onClose={() => setWaOpen(false)}
        lead={lead}
        templates={templates}
        employeeId={employee.id}
      />

      {/* Transfer Modal */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Lead">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">Transfer <strong>{lead.name}</strong> to another team member or AD.</p>
          <select
            value={transferTarget}
            onChange={e => setTransferTarget(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select employee…</option>
            {orgEmployees
              .filter(e => e.id !== lead.owner_id)
              .map(e => <option key={e.id} value={e.id}>{e.name} ({e.role.toUpperCase()})</option>)
            }
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={transferring} disabled={!transferTarget} onClick={handleTransfer}>Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
