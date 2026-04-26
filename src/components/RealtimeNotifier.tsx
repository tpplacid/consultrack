'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { EmployeeRole } from '@/types'

interface Props {
  employeeId: string
  role: EmployeeRole
  orgId: string
}

function playSound(type: 'lead' | 'breach' | 'approval') {
  try {
    const Ctx = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65)

    const freqs = type === 'lead'
      ? [523.25, 659.25, 783.99]
      : type === 'breach'
      ? [440, 369.99]
      : [659.25, 783.99]

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
      osc.connect(gain)
      osc.start(ctx.currentTime + i * 0.1)
      osc.stop(ctx.currentTime + i * 0.1 + 0.35)
    })
  } catch (_) { /* audio unavailable */ }
}

export function RealtimeNotifier({ employeeId, role, orgId }: Props) {
  const channelsRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']>[]>([])

  const notify = useCallback((msg: string, type: 'success' | 'error' | 'info') => {
    const configs = {
      success: { bg: '#064e3b', color: '#d1fae5', border: '#065f46', icon: '✅' },
      error:   { bg: '#7f1d1d', color: '#fee2e2', border: '#991b1b', icon: '🚨' },
      info:    { bg: '#1e3a5f', color: '#dbeafe', border: '#1e40af', icon: 'ℹ️' },
    }
    const c = configs[type]
    toast(msg, {
      icon: c.icon,
      duration: 7000,
      style: {
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        fontWeight: 500,
        padding: '10px 14px',
        borderRadius: '12px',
        maxWidth: '320px',
      },
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const leadsChannel = supabase
      .channel('leads-notify')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'leads',
        filter: `owner_id=eq.${employeeId}`,
      }, (p) => {
        playSound('lead')
        notify(`New lead assigned: ${p.new.name}`, 'success')
      })
      .subscribe()

    const slaChannel = supabase
      .channel('sla-notify')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'sla_breaches',
        filter: `owner_id=eq.${employeeId}`,
      }, (p) => {
        playSound('breach')
        notify(`SLA breach — stage ${p.new.stage} is overdue`, 'error')
      })
      .subscribe()

    const explanationChannel = supabase
      .channel('explanation-notify')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sla_breaches',
        filter: `owner_id=eq.${employeeId}`,
      }, (p) => {
        if (p.new.resolution === 'explanation_requested' && p.old.resolution !== 'explanation_requested') {
          playSound('breach')
          notify('Explanation requested for your deadline breach', 'error')
        }
      })
      .subscribe()

    const approvalChannel = supabase
      .channel('approval-notify')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'offline_lead_approvals',
        filter: `submitted_by=eq.${employeeId}`,
      }, (p) => {
        if (p.new.status === 'approved') { playSound('approval'); notify('Your lead was approved!', 'success') }
        if (p.new.status === 'rejected') { playSound('breach');   notify('Your lead was rejected', 'error') }
      })
      .subscribe()

    channelsRef.current = [leadsChannel, slaChannel, explanationChannel, approvalChannel]

    if (role === 'tl' || role === 'ad') {
      const teamBreachChannel = supabase
        .channel('team-breach-notify')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'sla_breaches',
        }, (p) => {
          if (p.new.owner_id !== employeeId) {
            playSound('breach')
            notify(`Team deadline breach — stage ${p.new.stage}`, 'error')
          }
        })
        .subscribe()

      const orgLeadsChannel = supabase
        .channel('org-leads-notify')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'leads',
        }, (p) => {
          if (p.new.owner_id !== employeeId) {
            notify(`New lead in org: ${p.new.name}`, 'info')
          }
        })
        .subscribe()

      channelsRef.current.push(teamBreachChannel, orgLeadsChannel)
    }

    return () => {
      channelsRef.current.forEach(c => supabase.removeChannel(c))
    }
  }, [employeeId, role, orgId, notify])

  return null
}
