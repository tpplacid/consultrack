'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, AlertTriangle, Zap } from 'lucide-react'

interface Notif {
  id: string
  type: 'breach' | 'lead' | 'explanation'
  message: string
}

interface Props {
  employeeId: string
  orgId: string
}

export function NotificationBanner({ employeeId, orgId }: Props) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    async function fetchPending() {
      const supabase = createClient()

      const [{ data: breaches }, { data: leads }] = await Promise.all([
        supabase
          .from('sla_breaches')
          .select('id, stage, resolution')
          .eq('owner_id', employeeId)
          .eq('resolution', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('leads')
          .select('id, name, created_at')
          .eq('owner_id', employeeId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const items: Notif[] = []
      breaches?.forEach(b => {
        items.push({ id: b.id, type: 'breach', message: `Unresolved SLA breach in stage ${b.stage}` })
      })
      leads?.forEach(l => {
        items.push({ id: l.id, type: 'lead', message: `New lead assigned: ${l.name}` })
      })

      if (items.length > 0) {
        setNotifs(items)
        setVisible(true)
        setTimeout(() => dismiss(), 10000)
      }
    }
    fetchPending()
  }, [employeeId, orgId])

  function dismiss() {
    setExiting(true)
    setTimeout(() => { setVisible(false); setExiting(false) }, 300)
  }

  if (!visible && !exiting) return null

  const breachCount = notifs.filter(n => n.type === 'breach').length
  const leadCount   = notifs.filter(n => n.type === 'lead').length

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] px-4 pt-3 pb-2 ${exiting ? 'notif-exit' : 'notif-enter'}`}
      style={{ background: 'linear-gradient(135deg, #0d2d1e 0%, #0f3d28 100%)' }}
    >
      <div className="max-w-xl mx-auto flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5">
          <Zap size={15} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {breachCount > 0 && leadCount > 0
              ? `${breachCount} SLA breach${breachCount > 1 ? 'es' : ''} · ${leadCount} new lead${leadCount > 1 ? 's' : ''}`
              : breachCount > 0
              ? `${breachCount} unresolved SLA breach${breachCount > 1 ? 'es' : ''}`
              : `${leadCount} new lead${leadCount > 1 ? 's' : ''} assigned`}
          </p>
          <div className="mt-1 space-y-0.5">
            {notifs.slice(0, 3).map(n => (
              <div key={n.id} className="flex items-center gap-1.5 text-xs text-white/60">
                {n.type === 'breach' ? <AlertTriangle size={10} className="text-amber-400 flex-shrink-0" /> : <Zap size={10} className="text-indigo-400 flex-shrink-0" />}
                <span className="truncate">{n.message}</span>
              </div>
            ))}
            {notifs.length > 3 && <p className="text-xs text-white/40">+{notifs.length - 3} more</p>}
          </div>
        </div>
        <button onClick={dismiss} className="flex-shrink-0 text-white/40 hover:text-white transition-colors p-1">
          <X size={16} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="mt-2 max-w-xl mx-auto h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500/60 rounded-full" style={{ animation: 'shrink 10s linear forwards' }} />
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  )
}
