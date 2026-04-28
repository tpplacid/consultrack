import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from './LeadDetailClient'
import { Employee } from '@/types'
import { SectionLayout } from '@/lib/fieldLayouts'

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

  const adminSupabase = createAdminClient()
  const [{ data: activities }, { data: templates }, { data: orgEmployees }, { data: org }, { data: layouts }] = await Promise.all([
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
    supabase
      .from('orgs')
      .select('sla_config')
      .eq('id', lead.org_id)
      .single(),
    adminSupabase
      .from('org_field_layouts')
      .select('*')
      .eq('org_id', lead.org_id)
      .order('position', { ascending: true }),
  ])

  const slaConfig = (org?.sla_config as Record<string, number> | null) || { A: 1, B: 5, C: 5, D: 20 }

  return (
    <LeadDetailClient
      lead={lead}
      activities={activities || []}
      templates={templates || []}
      employee={employee}
      orgEmployees={(orgEmployees || []) as unknown as Employee[]}
      slaConfig={slaConfig}
      sections={(layouts || []) as SectionLayout[]}
    />
  )
}
