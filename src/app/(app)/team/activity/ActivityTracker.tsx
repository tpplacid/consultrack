import { Employee } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getInitials } from '@/lib/utils'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  reports: Employee[]
  activityCounts: Record<string, number>
  today: string
}

export function ActivityTracker({ reports, activityCounts, today }: Props) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Team Activity — Today</h1>
      <p className="text-sm text-slate-500">Employees with &lt;2 activities today are flagged.</p>

      <div className="space-y-3">
        {reports.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No direct reports</p>
        )}
        {reports.map(r => {
          const count = activityCounts[r.id] || 0
          const flagged = count < 2
          return (
            <div key={r.id} className={`flex items-center gap-4 p-4 rounded-xl border ${flagged ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${flagged ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {getInitials(r.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500 capitalize">{r.role}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${flagged ? 'text-red-600' : 'text-green-600'}`}>{count}</p>
                <p className="text-xs text-slate-500">activities</p>
              </div>
              {flagged ? (
                <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
