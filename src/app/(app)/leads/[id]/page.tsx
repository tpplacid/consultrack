import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from './LeadDetailClient'
import { Employee } from '@/types'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await requireAuth()
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select(`
      *,
      owner:employees!leads_owner_id_fkey(id,name,role,email),
      reporting_manager:employees!leads_reporting_manager_id_fkey(id,name,role)
    `)
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const [{ data: activities }, { data: templates }, { data: orgEmployees }] = await Promise.all([
    supabase
      .from('activities')
      .select('*, employee:employees(id,name,role)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('wa_templates')
      .select('*')
      .eq('org_id', lead.org_id)
      .eq('is_active', true),
    supabase
      .from('employees')
      .select('id, name, role, reports_to, org_id, email, is_active')
      .eq('org_id', lead.org_id)
      .eq('is_active', true)
      .limit(100),
  ])

  return (
    <LeadDetailClient
      lead={lead}
      activities={activities || []}
      templates={templates || []}
      employee={employee}
      orgEmployees={(orgEmployees || []) as unknown as Employee[]}
    />
  )
}
