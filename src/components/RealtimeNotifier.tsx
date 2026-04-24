'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function RealtimeNotifier({ employeeId }: { employeeId: string }) {
  useEffect(() => {
    const supabase = createClient()

    // SLA breaches for this employee's leads
    const slaChannel = supabase
      .channel('sla-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sla_breaches', filter: `owner_id=eq.${employeeId}` },
        (payload) => {
          toast.error(`SLA breach detected! Stage ${payload.new.stage}`)
        }
      )
      .subscribe()

    // New leads assigned to this employee
    const leadsChannel = supabase
      .channel('leads-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `owner_id=eq.${employeeId}` },
        (payload) => {
          toast.success(`New lead assigned: ${payload.new.name}`)
        }
      )
      .subscribe()

    // SLA explanation requests (breach updated to explanation_requested for this employee)
    const explanationChannel = supabase
      .channel('explanation-notify')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sla_breaches', filter: `owner_id=eq.${employeeId}` },
        (payload) => {
          if (payload.new.resolution === 'explanation_requested' && payload.old.resolution !== 'explanation_requested') {
            toast('Explanation requested for an SLA breach', { icon: '⚠️' })
          }
        }
      )
      .subscribe()

    // Offline approval updates for leads submitted by this employee
    const approvalChannel = supabase
      .channel('approval-notify')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'offline_lead_approvals', filter: `submitted_by=eq.${employeeId}` },
        (payload) => {
          const status = payload.new.status
          if (status === 'approved') toast.success('Your lead was approved!')
          if (status === 'rejected') toast.error('Your lead was rejected.')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(slaChannel)
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(explanationChannel)
      supabase.removeChannel(approvalChannel)
    }
  }, [employeeId])

  return null
}
