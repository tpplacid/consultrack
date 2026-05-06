'use client'

import { useState, useMemo } from 'react'
import { Employee, Lead } from '@/types'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/leads/StageBadge'
import { formatDateTime, lf } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Download, Send, ThumbsDown, ThumbsUp, Copy, Check,
  CheckCircle2, Circle, Camera, AlertCircle, ExternalLink,
  MessageCircle, AtSign, FileText,
} from 'lucide-react'

type SignalTab = 'all' | 'instagram' | 'instagram_dm' | 'instagram_comment' | 'instagram_mention'

interface SignalConfig {
  dms_enabled?:       boolean
  comments_enabled?:  boolean
  comments_keywords?: string[]
  mentions_enabled?:  boolean
}

interface Props {
  admin:          Employee
  igLeads:        Lead[]
  lastSync:       string | null
  isConnected:    boolean
  setupSent:      string | null
  verifyToken:    string | null
  webhookUrl:     string
  igAccountId:    string | null
  hasCapiDataset: boolean
  signalConfig:   SignalConfig
}

const COPY_BTN = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0'

const SETUP_STEPS = [
  {
    title: 'Open Meta for Developers',
    desc:  'Go to developers.facebook.com → My Apps → select the same app you use for Facebook Lead Ads.',
    link:  { label: 'Open Meta for Developers', href: 'https://developers.facebook.com' },
  },
  {
    title: 'Subscribe to Instagram webhooks',
    desc:  'Under your app → Webhooks → select Instagram. Subscribe to: leadgen, messages, comments, mentions. Use the Callback URL and Verify Token shown below.',
  },
  {
    title: 'Connect an Instagram Business Account',
    desc:  'Your Instagram account must be a Business or Creator account linked to a Facebook Page. Go to Meta Business Suite → Settings → Instagram Accounts.',
    link:  { label: 'Open Business Suite', href: 'https://business.facebook.com' },
  },
  {
    title: 'Find your Instagram Business Account ID',
    desc:  'In Business Suite → Settings → Instagram Accounts, click your account. The ID appears in the URL. Share it with your Consultrack admin.',
  },
  {
    title: 'Create an Instagram Lead Ad',
    desc:  'In Meta Ads Manager, create a campaign with Leads objective. Select Instagram placement and Instant Form. Publish the ad.',
    link:  { label: 'Open Ads Manager', href: 'https://www.facebook.com/adsmanager' },
  },
]

const SOURCE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  instagram:         { label: 'Lead Ad',    icon: FileText,      color: 'text-pink-600 bg-pink-50' },
  instagram_dm:      { label: 'DM',         icon: MessageCircle, color: 'text-blue-600 bg-blue-50' },
  instagram_comment: { label: 'Comment',    icon: FileText,      color: 'text-purple-600 bg-purple-50' },
  instagram_mention: { label: 'Mention',    icon: AtSign,        color: 'text-amber-600 bg-amber-50' },
}

export function AdminInstagramClient({
  igLeads, lastSync, isConnected, setupSent,
  verifyToken, webhookUrl, igAccountId, hasCapiDataset, signalConfig,
}: Props) {
  const [tab, setTab]           = useState<SignalTab>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [pushing, setPushing]   = useState(false)
  const [signal, setSignal]     = useState<'BAD' | 'QUALIFIED'>('BAD')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (tab === 'all') return igLeads
    return igLeads.filter(l => l.source === tab)
  }, [igLeads, tab])

  const counts = useMemo(() => ({
    all:               igLeads.length,
    instagram:         igLeads.filter(l => l.source === 'instagram').length,
    instagram_dm:      igLeads.filter(l => l.source === 'instagram_dm').length,
    instagram_comment: igLeads.filter(l => l.source === 'instagram_comment').length,
    instagram_mention: igLeads.filter(l => l.source === 'instagram_mention').length,
  }), [igLeads])

  function copy(value: string, field: string) {
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function downloadCSV() {
    const target  = selected.length > 0 ? igLeads.filter(l => selected.includes(l.id)) : filtered
    const headers = ['name', 'phone', 'source', 'stage', 'ig_username', 'comment_text', 'first_message', 'location', 'preferred_course', 'created_at']
    const rows    = target.map(l => [
      l.name, l.phone ?? '', l.source, l.main_stage,
      lf(l, 'ig_username'), lf(l, 'comment_text'), lf(l, 'first_message'),
      lf(l, 'location'), lf(l, 'preferred_course'), l.created_at,
    ])
    const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `instagram-leads-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function pushToInstagram() {
    const leadsToSend = (selected.length > 0 ? igLeads.filter(l => selected.includes(l.id)) : filtered)
      .filter(l => l.source === 'instagram') // CAPI only supports Lead Ads source
    if (leadsToSend.length === 0) return toast.error('No Lead Ad leads to push (CAPI only supports Lead Ads)')
    if (!hasCapiDataset) return toast.error('Configure an Instagram CAPI dataset in settings first')
    setPushing(true)
    const res  = await fetch('/api/instagram/push-audience', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ lead_ids: leadsToSend.map(l => l.id), signal }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error || 'Failed')
    else toast.success(`Sent ${data.events_received} "${signal}" signals to Instagram`)
    setPushing(false)
  }

  // ── NOT CONNECTED ─────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Instagram Integration</h1>
          <p className="text-sm text-slate-500 mt-0.5">Connect your Instagram Business account to capture leads from Lead Ads, DMs, Comments, and Mentions</p>
        </div>

        {setupSent ? (
          <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-xl p-4">
            <Camera size={16} className="text-brand-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-800">Your setup guide is ready</p>
              <p className="text-xs text-brand-600 mt-0.5">Follow the steps below to connect your Instagram Business account.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Waiting for setup</p>
              <p className="text-xs text-amber-700 mt-0.5">Ask your Consultrack admin to send you the Instagram setup guide.</p>
            </div>
          </div>
        )}

        {setupSent && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Webhook credentials</h2>
                <p className="text-xs text-slate-500 mt-0.5">Same URL handles Lead Ads, DMs, Comments, and Mentions.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Callback URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono truncate min-w-0">{webhookUrl}</code>
                  <button className={COPY_BTN} onClick={() => copy(webhookUrl, 'webhook')}>
                    {copiedField === 'webhook' ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copiedField === 'webhook' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              {verifyToken && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Verify Token</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono truncate min-w-0">{verifyToken}</code>
                    <button className={COPY_BTN} onClick={() => copy(verifyToken, 'token')}>
                      {copiedField === 'token' ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copiedField === 'token' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Setup steps</h2>
              <ol className="space-y-4">
                {SETUP_STEPS.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                      {s.link && (
                        <a href={s.link.href} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium mt-1.5">
                          {s.link.label} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                {igAccountId ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} className="text-slate-400" />}
                <p className="text-sm font-medium text-slate-800">
                  {igAccountId ? `Account connected (ID: ${igAccountId})` : 'Instagram Business Account ID not yet configured'}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {igAccountId
                  ? 'Your Instagram Business Account is linked. Leads will route here automatically.'
                  : 'Share your Instagram Business Account ID with your Consultrack admin to complete setup.'}
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── CONNECTED VIEW ────────────────────────────────────────────
  const TABS: { key: SignalTab; label: string; icon: React.ElementType }[] = [
    { key: 'all',               label: `All (${counts.all})`,                     icon: Camera },
    { key: 'instagram',         label: `Lead Ads (${counts.instagram})`,           icon: FileText },
    { key: 'instagram_dm',      label: `DMs (${counts.instagram_dm})`,             icon: MessageCircle },
    { key: 'instagram_comment', label: `Comments (${counts.instagram_comment})`,   icon: FileText },
    { key: 'instagram_mention', label: `Mentions (${counts.instagram_mention})`,   icon: AtSign },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Instagram</h1>
          {lastSync && <p className="text-xs text-slate-500 mt-0.5">Last activity: {formatDateTime(lastSync)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>

      {/* Signal status tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Lead Ads',  enabled: true,                           count: counts.instagram,         icon: FileText,      color: 'text-pink-600 bg-pink-50 border-pink-100' },
          { label: 'DMs',       enabled: !!signalConfig.dms_enabled,     count: counts.instagram_dm,      icon: MessageCircle, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Comments',  enabled: !!signalConfig.comments_enabled, count: counts.instagram_comment, icon: FileText,      color: 'text-purple-600 bg-purple-50 border-purple-100' },
          { label: 'Mentions',  enabled: !!signalConfig.mentions_enabled, count: counts.instagram_mention, icon: AtSign,        color: 'text-amber-600 bg-amber-50 border-amber-100' },
        ].map(t => {
          const Icon = t.icon
          return (
            <div key={t.label} className={`rounded-xl border p-3.5 ${t.enabled ? t.color : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} />
                <span className="text-xs font-semibold">{t.label}</span>
                {!t.enabled && <span className="text-[10px] ml-auto">Off</span>}
              </div>
              <p className="text-xl font-bold">{t.count}</p>
            </div>
          )
        })}
      </div>

      {/* Signal type tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setSelected([]) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              <Icon size={11} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        {selected.length > 0 && (
          <p className="text-xs text-brand-600">
            {selected.length} selected · <button onClick={() => setSelected([])} className="underline">Clear</button>
          </p>
        )}
        <div className="ml-auto flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setSelected(filtered.map(l => l.id))}>
            Select all ({filtered.length})
          </Button>
          <Button size="sm" variant="outline" onClick={downloadCSV}>
            <Download size={14} /> CSV
          </Button>
          {hasCapiDataset && (
            <>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs">
                <button onClick={() => setSignal('BAD')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 ${signal === 'BAD' ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <ThumbsDown size={11} /> Unqualified
                </button>
                <button onClick={() => setSignal('QUALIFIED')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 border-l border-slate-300 ${signal === 'QUALIFIED' ? 'bg-green-50 text-green-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <ThumbsUp size={11} /> Qualified
                </button>
              </div>
              <Button size="sm" loading={pushing} onClick={pushToInstagram}>
                <Send size={14} /> Push CAPI
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={e => e.target.checked ? setSelected(filtered.map(l => l.id)) : setSelected([])} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Signal</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">IG Handle</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Preview</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(l => {
              const sig  = SOURCE_LABELS[l.source] ?? SOURCE_LABELS['instagram']
              const SigIcon = sig.icon
              const preview = lf(l, 'first_message') || lf(l, 'comment_text') || lf(l, 'mention_text') || lf(l, 'preferred_course') || ''
              return (
                <tr key={l.id} className={`hover:bg-slate-50 ${selected.includes(l.id) ? 'bg-brand-50' : ''}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/leads/${l.id}`} className="text-slate-900 hover:text-brand-600">{l.name}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${sig.color}`}>
                      <SigIcon size={10} /> {sig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.phone || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3"><StageBadge stage={l.main_stage} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{lf(l, 'ig_username') ? `@${lf(l, 'ig_username')}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px] truncate">{preview || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(l.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-slate-400 text-sm">
            {igLeads.length === 0
              ? 'No Instagram leads yet — webhook is live and waiting.'
              : `No ${tab === 'all' ? '' : SOURCE_LABELS[tab]?.label ?? tab} leads yet.`}
          </p>
        )}
      </div>
    </div>
  )
}
