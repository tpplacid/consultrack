'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lead, Activity, Employee, WaTemplate, LeadStage, SUB_STAGES } from '@/types'
import { SectionLayout, FieldDef, evaluateFormula, LEAD_COLUMN_KEYS } from '@/lib/fieldLayouts'
import { useOrgConfig } from '@/context/OrgConfigContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
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
  slaConfig: Record<string, number>
  sections: SectionLayout[]
}

export function LeadDetailClient({ lead: initialLead, activities: initialActivities, templates, employee, orgEmployees, slaConfig, sections }: Props) {
  const { stages, stageMap, leadSources, roleMap } = useOrgConfig()
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

  // Unified field values — column-based and custom_data merged into one string map
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const cd = (initialLead.custom_data as Record<string, unknown>) || {}
    return {
      // existing columns (stringified for uniform handling)
      lead_type:           initialLead.lead_type || '',
      location:            initialLead.location || '',
      twelfth_score:       initialLead.twelfth_score?.toString() || '',
      preferred_course:    initialLead.preferred_course || '',
      interested_colleges: initialLead.interested_colleges?.join(', ') || '',
      alternate_courses:   initialLead.alternate_courses?.join(', ') || '',
      father_phone:        initialLead.father_phone || '',
      decision_maker:      initialLead.decision_maker || '',
      income_status:       initialLead.income_status || '',
      loan_status:         initialLead.loan_status || '',
      application_fees:    initialLead.application_fees?.toString() || '',
      booking_fees:        initialLead.booking_fees?.toString() || '',
      tuition_fees:        initialLead.tuition_fees?.toString() || '',
      // custom_data values
      ...Object.fromEntries(Object.entries(cd).map(([k, v]) => [k, v !== null && v !== undefined ? String(v) : ''])),
    }
  })

  // Editable pipeline fields
  const [stageDraft, setStageDraft] = useState(lead.main_stage)
  const [subStageDraft, setSubStageDraft] = useState(lead.sub_stage || '')
  const [followupDraft, setFollowupDraft] = useState(lead.next_followup_at ? lead.next_followup_at.slice(0, 16) : '')

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
    if (from === '0') {
      const detailFields = ['lead_type', 'location', 'twelfth_score', 'preferred_course', 'decision_maker', 'income_status']
      const anyFilled = detailFields.some(f => !!fieldValues[f])
      if (!anyFilled) return 'Fill at least one lead detail (location, course, lead type, etc.) before moving out of Lead Gen'
    }
    const targetConfig = stageMap[to]
    if (targetConfig?.required_fields && targetConfig.required_fields.length > 0) {
      const missing = targetConfig.required_fields.filter(f => !fieldValues[f])
      if (missing.length > 0) return `Fill required fields before moving to ${targetConfig.label}: ${missing.join(', ')}`
    }
    return null
  }

  async function handleSave() {
    setSaving(true)

    // Split fieldValues into column updates vs custom_data
    const customData: Record<string, unknown> = {}
    const updates: Record<string, unknown> = {
      next_followup_at: followupDraft || null,
      sub_stage: subStageDraft || null,
    }
    for (const [key, strVal] of Object.entries(fieldValues)) {
      if (!LEAD_COLUMN_KEYS.has(key)) {
        customData[key] = strVal || null
        continue
      }
      // Parse column values with type-appropriate conversions
      if (key === 'twelfth_score') {
        updates[key] = strVal ? parseInt(strVal) : null
      } else if (key === 'application_fees' || key === 'booking_fees' || key === 'tuition_fees') {
        updates[key] = strVal ? parseFloat(strVal) : null
      } else if (key === 'interested_colleges' || key === 'alternate_courses') {
        updates[key] = strVal ? strVal.split(',').map(s => s.trim()).filter(Boolean) : []
      } else {
        updates[key] = strVal || null
      }
    }
    updates.custom_data = customData

    // Stage change
    if (stageDraft !== lead.main_stage) {
      const err = validateStageTransition(lead.main_stage, stageDraft)
      if (err) { toast.error(err); setSaving(false); return }
      updates.main_stage = stageDraft
      updates.stage_entered_at = new Date().toISOString()

      // Reset SLA deadline based on org-configured thresholds (skip for referral/offline leads)
      const slaDays = slaConfig[stageDraft]
      const sourceConfig = leadSources.find(s => s.key === lead.source)
      if (slaDays && !sourceConfig?.sla_excluded) {
        const deadline = new Date()
        deadline.setDate(deadline.getDate() + slaDays)
        updates.sla_deadline = deadline.toISOString()
      } else {
        updates.sla_deadline = null
      }

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
        <button onClick={() => router.back()} className="text-brand-500 hover:text-brand-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-brand-800 truncate">{lead.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1 text-sm text-brand-500">
              <Phone size={13} />
              <a href={`tel:${lead.phone}`} className="hover:text-brand-700">{lead.phone}</a>
            </div>
            <StageBadge stage={lead.main_stage} />
            {overdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                <AlertTriangle size={12} />
                Deadline Breached
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(roleMap[employee.role]?.can_transfer_leads ?? (employee.role === 'tl' || employee.role === 'ad')) && (
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
              <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Stage changes trigger deadline resets automatically</p>
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
                    {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
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
                    <p className="text-xs font-medium text-slate-500 mb-1">Response Deadline</p>
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

          {/* Layout-driven sections — all fields (columns + custom) */}
          {sections.map(section => (
            <LayoutSection
              key={section.id}
              section={section}
              fieldValues={fieldValues}
              onChange={(key, val) => setFieldValues(prev => ({ ...prev, [key]: val }))}
            />
          ))}

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
            <CardHeader>
              <CardTitle>Ownership</CardTitle>
              <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Assigned counsellor and their reporting manager — use Transfer to reassign this lead</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-brand-400 font-semibold">Owner</p>
                <p className="font-semibold text-brand-800">{(lead.owner as Employee)?.name || '—'}</p>
                <p className="text-xs text-brand-400 capitalize">{(lead.owner as Employee)?.role}</p>
              </div>
              <div>
                <p className="text-xs text-brand-400 font-semibold">Reporting Manager</p>
                <p className="font-semibold text-brand-800">{(lead.reporting_manager as Employee)?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-brand-400 font-semibold">Source</p>
                <p className="font-semibold text-brand-800 capitalize">{lead.source}</p>
              </div>
              <div>
                <p className="text-xs text-brand-400 font-semibold">Created</p>
                <p className="font-semibold text-brand-800">{timeAgo(lead.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <p className="text-[8px] text-brand-400 mt-0.5 font-semibold">Chronological log of all actions taken on this lead — stage changes, comments, and field updates</p>
            </CardHeader>
            <div className="divide-y divide-brand-50 max-h-[500px] overflow-y-auto">
              {activities.length === 0 ? (
                <div className="p-4 text-sm text-brand-400 text-center">No activity recorded yet.</div>
              ) : activities.map(act => (
                <div key={act.id} className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-brand-700 text-xs font-bold">
                        {(act.employee as Employee)?.name?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-brand-700">{(act.employee as Employee)?.name}</p>
                        <p className="text-xs text-brand-400 flex-shrink-0">{timeAgo(act.created_at)}</p>
                      </div>
                      <p className="text-xs text-brand-400 mt-0.5 capitalize">{act.activity_type.replace('_', ' ')}</p>
                      {act.note && <p className="text-sm text-brand-700 mt-1">{act.note}</p>}
                      {act.stage_from && act.stage_to && (
                        <p className="text-xs text-brand-500 font-semibold mt-1">
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
      <Modal open={transferOpen} onClose={() => { setTransferOpen(false) }} title="Transfer Lead">
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

// ── Layout-driven section renderer ────────────────────────────────────────────
// Handles both column-mapped fields (lead_type, location, …) and custom_data fields
// through a unified fieldValues: Record<string, string> map.

function LayoutSection({
  section,
  fieldValues,
  onChange,
}: {
  section: SectionLayout
  fieldValues: Record<string, string>
  onChange: (key: string, val: string) => void
}) {
  if (!section.fields || section.fields.length === 0) return null
  const sorted = [...section.fields].sort((a, b) => a.position - b.position)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.section_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {sorted.map(field => (
            <LayoutFieldInput
              key={field.id}
              field={field}
              fieldValues={fieldValues}
              onChange={onChange}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LayoutFieldInput({
  field,
  fieldValues,
  onChange,
}: {
  field: FieldDef
  fieldValues: Record<string, string>
  onChange: (key: string, val: string) => void
}) {
  const strVal = fieldValues[field.key] ?? ''
  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const labelEl = (
    <label className="block text-sm font-medium text-slate-700">
      {field.label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  if (field.type === 'formula') {
    const computed = evaluateFormula(field.formula, fieldValues)
    const numVal = parseFloat(computed)
    const isRupees = field.key.includes('fees') || field.key.includes('collected') || field.key.includes('amount') || field.key.includes('paid')
    const display = isRupees && !isNaN(numVal)
      ? '₹' + numVal.toLocaleString('en-IN')
      : (computed || '—')
    return (
      <div className="space-y-1">
        {labelEl}
        <div className={`px-3 py-2 border border-slate-200 rounded-lg text-sm bg-brand-800 text-white font-semibold ${isRupees ? 'text-base' : ''}`}>
          {display}
        </div>
      </div>
    )
  }

  if (field.type === 'boolean') {
    return (
      <div className="space-y-1">
        {labelEl}
        <select value={strVal} onChange={e => onChange(field.key, e.target.value)} className={inputClass + ' bg-white'}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-1">
        {labelEl}
        <select value={strVal} onChange={e => onChange(field.key, e.target.value)} className={inputClass + ' bg-white'}>
          <option value="">Select…</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1 col-span-2">
        {labelEl}
        <textarea
          rows={3}
          value={strVal}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className={inputClass + ' resize-none'}
        />
      </div>
    )
  }

  const inputType =
    field.type === 'number' ? 'number' :
    field.type === 'date'   ? 'date'   :
    field.type === 'email'  ? 'email'  :
    field.type === 'phone'  ? 'tel'    :
    field.type === 'url'    ? 'url'    : 'text'

  return (
    <div className="space-y-1">
      {labelEl}
      <input
        type={inputType}
        value={strVal}
        onChange={e => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
      />
    </div>
  )
}
