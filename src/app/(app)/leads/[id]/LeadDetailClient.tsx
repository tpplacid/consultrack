'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lead, Activity, Employee, WaTemplate, LeadStage, SUB_STAGES } from '@/types'
import { SectionLayout, FieldDef, evaluateFormula } from '@/lib/fieldLayouts'
import { computeSlaDeadline, type SlaConfigBySource } from '@/lib/sla'
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
  AlertTriangle, Save, ArrowRightLeft,
  MessageCircle, AtSign, FileText, Camera,
} from 'lucide-react'

interface Props {
  lead: Lead
  activities: Activity[]
  templates: WaTemplate[]
  employee: Employee
  orgEmployees: Employee[]
  slaConfig: Record<string, number>
  slaConfigBySource?: SlaConfigBySource
  sections: SectionLayout[]
  unreadDmCount?: number
}

export function LeadDetailClient({ lead: initialLead, activities: initialActivities, templates, employee, orgEmployees, slaConfig, slaConfigBySource, sections, unreadDmCount = 0 }: Props) {
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

  // Unified field values — all org-specific fields (including currency/revenue
  // fields) live in custom_data since migration 011. No special column handling.
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const cd = (initialLead.custom_data as Record<string, unknown>) || {}
    // Pre-migration safety: pick up legacy fee columns if still present on the lead row
    const legacy = initialLead as unknown as Record<string, unknown>
    const legacyFees: Record<string, string> = {}
    for (const k of ['application_fees', 'booking_fees', 'tuition_fees']) {
      const v = legacy[k]
      if (v !== null && v !== undefined && v !== '') legacyFees[k] = String(v)
    }
    return {
      ...legacyFees,
      ...Object.fromEntries(Object.entries(cd).map(([k, v]) => [k, v !== null && v !== undefined ? String(v) : ''])),
    }
  })

  // Editable pipeline fields
  const [stageDraft, setStageDraft] = useState(lead.main_stage)
  const [subStageDraft, setSubStageDraft] = useState(lead.sub_stage || '')
  const [followupDraft, setFollowupDraft] = useState(lead.next_followup_at ? lead.next_followup_at.slice(0, 16) : '')

  const supabase = createClient()

  // Unread-DM banner state. Server passes the count computed from
  // lead_views.viewed_at; client dismisses on demand and also auto-marks
  // viewed after a short delay so a passive open clears it.
  const [unreadCount, setUnreadCount] = useState(unreadDmCount)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  async function markLeadViewed() {
    await supabase.from('lead_views').upsert(
      { employee_id: employee.id, lead_id: lead.id, viewed_at: new Date().toISOString() },
      { onConflict: 'employee_id,lead_id' },
    )
  }

  // Mark as viewed 4 s after mount so the banner has time to register
  // visually but the count resets for the next visit. If the user
  // explicitly dismisses earlier, that path also calls markLeadViewed().
  useEffect(() => {
    const t = setTimeout(() => { void markLeadViewed() }, 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  // Realtime activity updates
  useEffect(() => {
    const channel = supabase
      .channel(`lead-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities', filter: `lead_id=eq.${lead.id}` }, (payload) => {
        const act = payload.new as Activity
        setActivities(prev => [act, ...prev])
        if (act.activity_type === 'ig_dm_received') setUnreadCount(c => c + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  function validateStageTransition(_from: LeadStage, to: LeadStage): string | null {
    // Per-stage required fields are configured by the org admin in
    // Settings → Stages → click stage → "Required fields" toggles.
    // This is the only validation — no hardcoded org-specific checks.
    const targetConfig = stageMap[to]
    if (targetConfig?.required_fields && targetConfig.required_fields.length > 0) {
      const missing = targetConfig.required_fields.filter(f => !fieldValues[f])
      if (missing.length > 0) {
        const labels = missing.map(k => stageMap[to] && (sections.flatMap(s => s.fields).find(f => f.key === k)?.label ?? k))
        return `Fill required fields before moving to ${targetConfig.label}: ${labels.join(', ')}`
      }
    }
    return null
  }

  async function handleSave() {
    setSaving(true)

    // All org-defined fields live in custom_data. Currency/number values are
    // stored as numbers so analytics can sum them without type coercion.
    const customData: Record<string, unknown> = {}
    const updates: Record<string, unknown> = {
      next_followup_at: followupDraft || null,
      sub_stage: subStageDraft || null,
    }
    // Build a lookup of field type by key from the sections schema
    const typeByKey: Record<string, string> = {}
    for (const sec of sections) for (const f of sec.fields) typeByKey[f.key] = f.type
    for (const [key, strVal] of Object.entries(fieldValues)) {
      if (!strVal) { customData[key] = null; continue }
      const t = typeByKey[key]
      if (t === 'currency' || t === 'number') {
        const n = parseFloat(strVal)
        customData[key] = isFinite(n) ? n : null
      } else if (t === 'boolean') {
        customData[key] = strVal === 'true'
      } else {
        customData[key] = strVal
      }
    }
    updates.custom_data = customData

    // Stage change
    if (stageDraft !== lead.main_stage) {
      const err = validateStageTransition(lead.main_stage, stageDraft)
      if (err) { toast.error(err); setSaving(false); return }
      updates.main_stage = stageDraft
      updates.stage_entered_at = new Date().toISOString()

      // Reset SLA deadline based on per-source override → org default
      // (skip for referral/offline-style sources marked sla_excluded).
      const sourceConfig = leadSources.find(s => s.key === lead.source)
      if (sourceConfig?.sla_excluded) {
        updates.sla_deadline = null
      } else {
        const dt = computeSlaDeadline({
          stage:                stageDraft,
          source:               lead.source,
          orgSlaConfig:         slaConfig,
          orgSlaConfigBySource: slaConfigBySource ?? null,
        })
        updates.sla_deadline = dt ? dt.toISOString() : null
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
    // Bust /admin/leads + /admin/analytics caches so the next admin visit
    // sees fresh data instead of the stale 60s/180s snapshot.
    void fetch('/api/cache/invalidate-leads', { method: 'POST' })
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
      void fetch('/api/cache/invalidate-leads', { method: 'POST' })
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

  const showUnreadBanner = unreadCount > 0 && !bannerDismissed

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {showUnreadBanner && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 sticky top-2 z-10 shadow-sm">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-white font-bold text-xs">
            {unreadCount}
          </span>
          <p className="text-sm text-amber-900 font-medium flex-1">
            {unreadCount === 1 ? '1 new message' : `${unreadCount} new messages`} since you last viewed this lead
          </p>
          <button
            onClick={() => { setBannerDismissed(true); void markLeadViewed() }}
            className="text-xs text-amber-800 font-semibold underline hover:text-amber-900"
          >
            Mark as read
          </button>
        </div>
      )}
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-brand-500 hover:text-brand-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-brand-800 truncate">{lead.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {lead.phone ? (
              <div className="flex items-center gap-1 text-sm text-brand-500">
                <Phone size={13} />
                <a href={`tel:${lead.phone}`} className="hover:text-brand-700">{lead.phone}</a>
              </div>
            ) : (
              <span className="text-xs text-brand-400 italic">No phone — channel: {lead.source}</span>
            )}
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
          {lead.phone && (
            <Button size="sm" variant="outline" onClick={() => setWaOpen(true)}>
              <MessageSquare size={14} />
              WhatsApp
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lead details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Source Context — for IG DMs, swaps in a full chat-thread view
              (first message + every follow-up activity). Other IG signals
              (comment, mention, lead ad) keep the single-content card. */}
          {lead.source === 'instagram_dm'
            ? <ConversationCard lead={lead} activities={activities} />
            : <SourceContextCard lead={lead} />}

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
    field.type === 'number'   ? 'number' :
    field.type === 'currency' ? 'number' :
    field.type === 'date'     ? 'date'   :
    field.type === 'email'    ? 'email'  :
    field.type === 'phone'    ? 'tel'    :
    field.type === 'url'      ? 'url'    : 'text'

  // Currency fields get a ₹ prefix and right-aligned numeric input
  if (field.type === 'currency') {
    return (
      <div className="space-y-1">
        {labelEl}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">₹</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={strVal}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || '0'}
            className={`${inputClass} pl-7 tabular-nums`}
          />
        </div>
      </div>
    )
  }

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

// Full chat-thread view of an Instagram DM lead. Shows custom_data
// .first_message as the seed, then every ig_dm_received activity in
// chronological order, rendered as inbound chat bubbles.
function ConversationCard({ lead, activities }: { lead: Lead; activities: Activity[] }) {
  const cd       = (lead.custom_data as Record<string, unknown>) || {}
  const username = (cd.ig_username as string | undefined) || null
  const firstMsg = (cd.first_message as string | undefined) || ''
  const isStory  = cd.is_story_reply === 'true'

  // Build a normalised list: { text, ts, key } sorted oldest-first so it
  // reads top-to-bottom like a chat history.
  type Msg = { text: string; ts: string; key: string; placeholder?: boolean }
  const dmActivities = activities.filter(a => a.activity_type === 'ig_dm_received')
  const messages: Msg[] = []
  if (firstMsg) {
    messages.push({ text: firstMsg, ts: lead.created_at, key: 'first', placeholder: false })
  } else {
    // No text first message captured (image/sticker, or Standard Access
    // partial payload). Still seed the thread with a placeholder so the
    // timeline starts at the lead's creation moment.
    messages.push({ text: '[message received]', ts: lead.created_at, key: 'first', placeholder: true })
  }
  for (const a of dmActivities) {
    messages.push({ text: a.note || '[message]', ts: a.created_at, key: a.id, placeholder: !a.note })
  }
  messages.sort((a, b) => a.ts.localeCompare(b.ts))

  const lastTs   = messages[messages.length - 1]?.ts
  const lastDate = lastTs ? new Date(lastTs) : null
  const isFresh  = lastDate ? Date.now() - lastDate.getTime() < 5 * 60 * 1000 : false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-600" />
              {isStory ? 'Story reply conversation' : 'Direct message conversation'}
              {isFresh && <span className="inline-flex items-center gap-1 ml-1 text-[10px] font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                LIVE
              </span>}
            </CardTitle>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mt-1">
              {messages.length} message{messages.length === 1 ? '' : 's'}
              {lastDate && <span className="normal-case tracking-normal text-slate-500 font-normal"> — last {timeAgo(lastTs!)}</span>}
            </p>
          </div>
          {username && (
            <a
              href={`https://instagram.com/direct/t/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-white bg-gradient-to-tr from-pink-500 to-amber-400 px-2.5 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap"
            >
              Reply on Instagram
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {messages.map(m => (
            <div key={m.key} className="flex flex-col items-start max-w-[85%]">
              <div className={
                'text-sm leading-relaxed rounded-2xl rounded-bl-md px-3 py-2 whitespace-pre-wrap break-words ' +
                (m.placeholder
                  ? 'bg-slate-50 text-slate-400 italic border border-slate-200'
                  : 'bg-blue-50 text-slate-800 border border-blue-100')
              }>
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 ml-2">{timeAgo(m.ts)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Renders the message body / comment text / mention text that the IG webhook
// captured into custom_data. Shows nothing for non-IG sources.
function SourceContextCard({ lead }: { lead: Lead }) {
  const cd = (lead.custom_data as Record<string, unknown>) || {}
  const username = (cd.ig_username as string | undefined) || null
  const source   = lead.source || ''

  let icon: React.ReactNode = null
  let title  = ''
  let body   = ''
  let label  = ''

  if (source === 'instagram_dm') {
    icon  = <MessageCircle size={16} className="text-blue-600" />
    title = cd.is_story_reply === 'true' ? 'Story reply' : 'Direct message'
    body  = (cd.first_message as string) || ''
    label = 'First message'
  } else if (source === 'instagram_comment') {
    icon  = <FileText size={16} className="text-purple-600" />
    title = 'Comment'
    body  = (cd.comment_text as string) || ''
    label = 'Comment text'
  } else if (source === 'instagram_mention') {
    icon  = <AtSign size={16} className="text-amber-600" />
    title = 'Mention'
    body  = (cd.mention_text as string) || ''
    label = 'Mention text'
  } else if (source === 'instagram') {
    icon  = <Camera size={16} className="text-pink-600" />
    title = 'Instagram Lead Ad'
  } else {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {username && (
          <a
            href={`https://instagram.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-400 mt-0.5 font-semibold hover:underline"
          >
            @{username}
          </a>
        )}
      </CardHeader>
      <CardContent>
        {body ? (
          <>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">{label}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              {body}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-400 italic">No content captured (Standard Access — request reviewer fetched profile only).</p>
        )}
      </CardContent>
    </Card>
  )
}
