'use client'

import { useState, useMemo } from 'react'
import { Employee, Lead } from '@/types'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/leads/StageBadge'
import { formatDateTime, lf } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Download, Send, ThumbsDown, ThumbsUp,
  Copy, Check, CheckCircle2, Circle,
  Zap, AlertCircle, ExternalLink,
} from 'lucide-react'

interface Props {
  admin:       Employee
  metaLeads:   Lead[]
  lastSync:    string | null
  isConnected: boolean
  setupSent:   string | null
  verifyToken: string | null
  webhookUrl:  string
  pageId:      string | null
}

const COPY_BTN = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0'

const SETUP_STEPS = [
  {
    title: 'Open Meta for Developers',
    desc:  "Go to developers.facebook.com → My Apps → select your app (or create one if you haven't already).",
    link:  { label: 'Open Meta for Developers', href: 'https://developers.facebook.com' },
  },
  {
    title: 'Add the Webhooks product',
    desc:  'In your app dashboard, click Add Product and select Webhooks.',
  },
  {
    title: 'Subscribe to the Page → leadgen field',
    desc:  'Under Webhooks → Page → find the leadgen field and click Subscribe. Use the Callback URL and Verify Token shown below.',
  },
  {
    title: 'Find your Facebook Page ID',
    desc:  'Go to Meta Business Suite → Settings → Page Info. Copy your Page ID and share it with your Consultrack admin to complete routing.',
    link:  { label: 'Open Business Suite', href: 'https://business.facebook.com' },
  },
]

export function AdminMetaClient({
  metaLeads, lastSync, isConnected, setupSent,
  verifyToken, webhookUrl, pageId,
}: Props) {
  const [leads]               = useState(metaLeads)
  const [selected, setSelected]       = useState<string[]>([])
  const [pushing, setPushing]         = useState(false)
  const [stageFilter, setStageFilter] = useState('')
  const [signal, setSignal]           = useState<'BAD' | 'QUALIFIED'>('BAD')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const filtered = useMemo(() =>
    stageFilter ? leads.filter(l => l.main_stage === stageFilter) : leads,
    [leads, stageFilter]
  )

  function copy(value: string, field: string) {
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function downloadCSV() {
    const target = selected.length > 0 ? leads.filter(l => selected.includes(l.id)) : filtered
    const headers = ['name', 'phone', 'source', 'stage', 'location', 'preferred_course', 'created_at']
    const rows = target.map(l => [l.name, l.phone, l.source, l.main_stage, lf(l, 'location'), lf(l, 'preferred_course'), l.created_at])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meta-leads-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function pushToMeta() {
    const ids = selected.length > 0 ? selected : filtered.map(l => l.id)
    if (ids.length === 0) return toast.error('No leads to push')
    setPushing(true)
    const res = await fetch('/api/meta/push-audience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_ids: ids, signal }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error || 'Failed')
    else toast.success(`Sent ${data.events_received} "${signal}" signals to Meta`)
    setPushing(false)
  }

  // ── NOT CONNECTED ─────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meta Lead Integration</h1>
          <p className="text-sm text-slate-500 mt-0.5">Connect your Facebook &amp; Instagram lead ads to auto-import leads</p>
        </div>

        {setupSent ? (
          <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-xl p-4">
            <Zap size={16} className="text-brand-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-800">Your setup guide is ready</p>
              <p className="text-xs text-brand-600 mt-0.5">Follow the steps below to connect your Meta Page — leads will start flowing in automatically.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Waiting for setup</p>
              <p className="text-xs text-amber-700 mt-0.5">Ask your Consultrack admin to send you the setup guide to get started.</p>
            </div>
          </div>
        )}

        {setupSent && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Webhook credentials</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter these exactly when Meta asks during webhook setup.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Callback URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono truncate min-w-0">
                    {webhookUrl}
                  </code>
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
                    <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono truncate min-w-0">
                      {verifyToken}
                    </code>
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
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
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
                {pageId ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} className="text-slate-400" />}
                <p className="text-sm font-medium text-slate-800">
                  {pageId ? `Page connected (ID: ${pageId})` : 'Page ID not yet configured'}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {pageId
                  ? 'Your Facebook Page is linked. Leads will route to this account automatically.'
                  : 'Share your Facebook Page ID with your Consultrack admin to complete setup.'}
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── CONNECTED VIEW ────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meta Lead Integration</h1>
          {lastSync && <p className="text-xs text-slate-500 mt-0.5">Last lead received: {formatDateTime(lastSync)}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Connected</p>
            <p className="text-xs text-slate-500">Receiving leads automatically from Meta Lead Ads</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Push Conversion Signal to Meta</h3>
        <p className="text-xs text-slate-500">Send lead quality signals back to Meta to optimise your ad targeting and reduce cost-per-lead.</p>

        <div className="flex flex-wrap gap-3">
          <select value={stageFilter} onChange={e => { setStageFilter(e.target.value); setSelected([]) }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">All stages</option>
            <option value="C">Hot Leads</option>
            <option value="F">Closed Won</option>
            <option value="E">Closed Lost</option>
            <option value="X">Unqualified</option>
          </select>

          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
            <button onClick={() => setSignal('BAD')}
              className={`flex items-center gap-1.5 px-3 py-2 ${signal === 'BAD' ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ThumbsDown size={13} /> Unqualified
            </button>
            <button onClick={() => setSignal('QUALIFIED')}
              className={`flex items-center gap-1.5 px-3 py-2 border-l border-slate-300 ${signal === 'QUALIFIED' ? 'bg-green-50 text-green-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ThumbsUp size={13} /> Qualified
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => setSelected(filtered.map(l => l.id))}>
              Select {stageFilter ? 'Stage' : 'All'} ({filtered.length})
            </Button>
            <Button size="sm" variant="outline" onClick={downloadCSV}>
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" loading={pushing} onClick={pushToMeta}>
              <Send size={14} />
              Push {selected.length > 0 ? `(${selected.length})` : `(${filtered.length})`}
            </Button>
          </div>
        </div>

        {selected.length > 0 && (
          <p className="text-xs text-brand-600">
            {selected.length} leads selected · <button onClick={() => setSelected([])} className="underline">Clear</button>
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={e => e.target.checked ? setSelected(filtered.map(l => l.id)) : setSelected([])}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Course</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(l => (
              <tr key={l.id} className={`hover:bg-slate-50 ${selected.includes(l.id) ? 'bg-brand-50' : ''}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/leads/${l.id}`} className="text-slate-900 hover:text-brand-600">{l.name}</Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{l.phone}</td>
                <td className="px-4 py-3"><StageBadge stage={l.main_stage} /></td>
                <td className="px-4 py-3 text-slate-500">{lf(l, 'preferred_course') || '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-slate-400">
            {leads.length === 0
              ? 'No Meta leads yet — webhook is connected and waiting for your first lead form submission.'
              : 'No leads match the selected stage.'}
          </p>
        )}
      </div>
    </div>
  )
}
