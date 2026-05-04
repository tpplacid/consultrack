'use client'

import { useState } from 'react'
import { Lead, Employee } from '@/types'
import { formatDateTime, lf } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Download, Flame, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  warmStuck: Lead[]
  hotStuck: Lead[]
}

function daysStuck(since: string) {
  return Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24))
}

function toCSV(rows: Lead[], type: string): string {
  const header = ['Type', 'Name', 'Phone', 'Stage', 'Owner', 'Location', 'Lead Type', 'Preferred Course', 'Days Stuck', 'Stage Entered At']
  const lines = rows.map(r => [
    type,
    r.name,
    r.phone,
    r.main_stage,
    (r.owner as Employee)?.name || '',
    lf(r, 'location'),
    lf(r, 'lead_type'),
    lf(r, 'preferred_course'),
    daysStuck(r.stage_entered_at).toString(),
    r.stage_entered_at,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  return [header.join(','), ...lines].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function LeadTable({ leads, type, stageLabel, color }: { leads: Lead[]; type: string; stageLabel: string; color: string }) {
  const stuck = daysStuck

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h2 className="text-base font-semibold text-slate-800">{stageLabel}</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{leads.length} leads</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => downloadCSV(toCSV(leads, type), `stuck_${type.toLowerCase().replace(/\s+/g, '_')}.csv`)}>
          <Download size={13} />
          Export CSV
        </Button>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          No stuck leads in this category
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Lead</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Owner</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Days Stuck</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Since</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(l => {
                  const days = stuck(l.stage_entered_at)
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{l.name}</p>
                        <p className="text-xs text-slate-500">{l.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700">{l.main_stage}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{(l.owner as Employee)?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 font-semibold text-sm ${days > 10 ? 'text-red-600' : days > 7 ? 'text-orange-500' : 'text-amber-500'}`}>
                          <AlertTriangle size={12} />
                          {days}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(l.stage_entered_at)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${l.id}`} className="text-indigo-600 hover:underline text-xs font-medium">View →</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {leads.map(l => {
              const days = stuck(l.stage_entered_at)
              return (
                <Link key={l.id} href={`/leads/${l.id}`} className="block bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{l.name}</p>
                      <p className="text-xs text-slate-500">{l.phone}</p>
                      <p className="text-xs text-slate-500 mt-1">Owner: {(l.owner as Employee)?.name || '—'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-bold ${days > 10 ? 'text-red-600' : days > 7 ? 'text-orange-500' : 'text-amber-500'}`}>
                        {days}d stuck
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">Stage {l.main_stage}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function StuckLeadsClient({ warmStuck, hotStuck }: Props) {
  const allLeads = [
    ...warmStuck.map(l => ({ ...l, _type: 'Warm to Hot (A→C)' })),
    ...hotStuck.map(l => ({ ...l, _type: 'Hot to Application (C→D)' })),
  ]

  function downloadAll() {
    const combined = [
      toCSV(warmStuck, 'Warm to Hot (A→C)'),
      toCSV(hotStuck, 'Hot to Application (C→D)').split('\n').slice(1).join('\n'),
    ].join('\n')
    downloadCSV(combined, 'stuck_leads_all.csv')
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stuck Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">Leads that haven&apos;t progressed past key stages in 5+ days</p>
        </div>
        <Button onClick={downloadAll} variant="outline">
          <Download size={15} />
          Export All ({allLeads.length})
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{warmStuck.length}</p>
            <p className="text-xs text-amber-600 font-medium">Warm → Hot (A/B stuck)</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Flame size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{hotStuck.length}</p>
            <p className="text-xs text-red-600 font-medium">Hot → Application (C stuck)</p>
          </div>
        </div>
      </div>

      <LeadTable
        leads={warmStuck}
        type="Warm to Hot (A→C)"
        stageLabel="Warm to Hot — Stuck in A / B"
        color="bg-amber-400"
      />

      <LeadTable
        leads={hotStuck}
        type="Hot to Application (C→D)"
        stageLabel="Hot to Application — Stuck in C"
        color="bg-red-500"
      />
    </div>
  )
}
