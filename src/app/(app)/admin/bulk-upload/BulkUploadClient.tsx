'use client'

import { useState, useRef } from 'react'
import { Employee } from '@/types'
import { LeadSource } from '@/context/OrgConfigContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Props {
  admin: Employee
  employees: Employee[]
  leadSources: LeadSource[]
}

interface ParsedRow {
  row: number
  name: string
  phone: string
  ownerName: string
  source: string
  location: string
  lead_type: string
  preferred_course: string
  comments: string
  owner: Employee | null
  error: string | null
}


function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}

export function BulkUploadClient({ admin, employees, leadSources }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sourceKeys = leadSources.map(s => s.key)
  const templateCSV = `name,phone,owner,source,location,comments\nJohn Doe,9876543210,Jane Smith,${sourceKeys[0] ?? 'offline'},Bangalore,First contact via call\n`

  const empByName = new Map(employees.map(e => [e.name.toLowerCase().trim(), e]))

  function handleFile(file: File) {
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const all = parseCSV(text)
      if (all.length < 2) { toast.error('CSV must have a header row and at least one data row'); return }

      const header = all[0].map(h => h.toLowerCase().trim())
      const idx = (col: string) => header.indexOf(col)

      const iName = idx('name')
      const iPhone = idx('phone')
      const iOwner = idx('owner')
      const iSource = idx('source')
      const iLocation = idx('location')
      const iLeadType = idx('lead_type')
      const iPrefCourse = idx('preferred_course')
      const iComments = idx('comments')

      if (iName === -1 || iPhone === -1 || iOwner === -1) {
        toast.error('CSV must have columns: name, phone, owner')
        return
      }

      const parsed: ParsedRow[] = all.slice(1).map((cols, i) => {
        const get = (idx: number) => (idx >= 0 ? cols[idx] || '' : '')
        const name = get(iName)
        const phone = get(iPhone)
        const ownerName = get(iOwner)
        const source = get(iSource) || 'offline'

        let error: string | null = null
        if (!name) error = 'Name is required'
        else if (!phone) error = 'Phone is required'
        else if (!ownerName) error = 'Owner is required'
        else if (!/^\d{7,15}$/.test(phone.replace(/[\s+\-()]/g, ''))) error = 'Invalid phone number'
        else if (source && !sourceKeys.includes(source)) error = `Source must be one of: ${sourceKeys.join(', ')}`

        const owner = ownerName ? empByName.get(ownerName.toLowerCase().trim()) || null : null
        if (!error && ownerName && !owner) error = `Owner "${ownerName}" not found`

        return {
          row: i + 2,
          name,
          phone,
          ownerName,
          source,
          location: get(iLocation),
          lead_type: get(iLeadType),
          preferred_course: get(iPrefCourse),
          comments: get(iComments),
          owner,
          error,
        }
      })

      setRows(parsed)
    }
    reader.readAsText(file)
  }

  async function handleUpload() {
    const valid = rows.filter(r => !r.error && r.owner)
    if (valid.length === 0) return
    setUploading(true)

    // Pre-check quota — bail BEFORE inserting anything if the upload would
    // blow past the org's ceiling. There's a small race window (other
    // inserts could land between this check and our batch), but for a
    // single-admin bulk upload it's the right trade-off.
    const quotaRes = await fetch('/api/quota')
    if (quotaRes.ok) {
      const q = await quotaRes.json() as { atLimit: boolean; remaining: number | null; limit: number | null; count: number }
      if (q.atLimit) {
        toast.error(`Lead limit reached (${q.count}/${q.limit}). Upgrade or export & reset.`)
        setUploading(false)
        return
      }
      if (q.remaining !== null && valid.length > q.remaining) {
        toast.error(
          `Cannot upload ${valid.length} leads — only ${q.remaining} slots left under your plan (${q.count}/${q.limit}). Trim the file or request a higher limit.`,
          { duration: 7000 },
        )
        setUploading(false)
        return
      }
    }

    const supabase = createClient()
    let success = 0
    let failed = 0

    const BATCH = 50
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH)
      const leadsToInsert = batch.map(r => {
        const custom_data: Record<string, string> = {}
        if (r.location)         custom_data.location         = r.location
        if (r.lead_type)        custom_data.lead_type         = r.lead_type
        if (r.preferred_course) custom_data.preferred_course  = r.preferred_course
        if (r.comments)         custom_data.comments          = r.comments
        return {
          org_id: admin.org_id,
          name: r.name,
          phone: r.phone.replace(/[\s+\-()]/g, ''),
          source: r.source,
          main_stage: '0',
          owner_id: r.owner!.id,
          reporting_manager_id: r.owner!.reports_to || null,
          custom_data,
          approved: r.source === 'meta',
        }
      })

      const { data: inserted, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select('id, owner_id')

      if (error) {
        failed += batch.length
        toast.error(`Batch ${Math.floor(i / BATCH) + 1} failed: ${error.message}`)
        continue
      }

      success += inserted.length

      if (inserted.length > 0) {
        await supabase.from('activities').insert(
          inserted.map(lead => ({
            org_id: admin.org_id,
            lead_id: lead.id,
            employee_id: lead.owner_id,
            activity_type: 'lead_created',
            note: 'Lead created via bulk upload',
          }))
        )
      }
    }

    setUploading(false)
    setResult({ success, failed })
    if (success > 0) toast.success(`${success} lead(s) uploaded`)
    if (failed > 0) toast.error(`${failed} lead(s) failed`)
    if (success > 0) {
      setRows([])
      // Bust admin-leads + analytics + quota caches and run threshold check
      // — passes createdCount so 80%/100% alerts fire if we crossed.
      void fetch('/api/cache/invalidate-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdCount: success }),
      })
    }
  }

  const validCount = rows.filter(r => !r.error).length
  const errorCount = rows.filter(r => r.error).length

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">Bulk Lead Upload</h1>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCSV)}`}
          download="consultrack_leads_template.csv"
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Download size={15} />
          Download template
        </a>
      </div>

      {result && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <CheckCircle size={18} className="text-green-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{result.success} leads uploaded successfully</p>
            {result.failed > 0 && <p className="text-xs text-red-600">{result.failed} rows failed — check for duplicate phone numbers</p>}
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Upload CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4 pb-5">
          <p className="text-sm text-slate-600">
            Required columns: <code className="bg-slate-100 px-1 rounded text-xs">name</code>, <code className="bg-slate-100 px-1 rounded text-xs">phone</code>, <code className="bg-slate-100 px-1 rounded text-xs">owner</code> (employee name).<br />
            Optional: <code className="bg-slate-100 px-1 rounded text-xs">source</code>, <code className="bg-slate-100 px-1 rounded text-xs">location</code>, <code className="bg-slate-100 px-1 rounded text-xs">lead_type</code>, <code className="bg-slate-100 px-1 rounded text-xs">preferred_course</code>, <code className="bg-slate-100 px-1 rounded text-xs">comments</code>.
          </p>

          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <Upload size={28} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Click to select or drag & drop a CSV</p>
            <p className="text-xs text-slate-400 mt-1">UTF-8 CSV, max 5000 rows</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Preview — {rows.length} rows</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} />{validCount} valid</span>
                {errorCount > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle size={14} />{errorCount} errors</span>}
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">#</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Owner</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Source</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Location</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.row} className={r.error ? 'bg-red-50' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-2 text-slate-400">{r.row}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.name || <span className="text-red-400 italic">missing</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{r.phone || <span className="text-red-400 italic">missing</span>}</td>
                    <td className="px-3 py-2">
                      {r.owner
                        ? <span className="text-green-700">{r.owner.name} <span className="text-slate-400">({r.owner.role})</span></span>
                        : <span className="text-red-500">{r.ownerName || <span className="italic">missing</span>}</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-slate-600 capitalize">{r.source || 'offline'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.location || '—'}</td>
                    <td className="px-3 py-2">
                      {r.error
                        ? <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} />{r.error}</span>
                        : <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} />OK</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={validCount === 0}
            >
              <Upload size={15} />
              Upload {validCount} valid lead{validCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Active Employees</CardTitle></CardHeader>
        <CardContent className="pb-4">
          <p className="text-xs text-slate-500 mb-3">Use these exact names in the <code className="bg-slate-100 px-1 rounded">owner</code> column (case-insensitive).</p>
          <div className="flex flex-wrap gap-2">
            {employees.map(e => (
              <span key={e.id} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">
                {e.name} <span className="text-slate-400 capitalize">({e.role})</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
