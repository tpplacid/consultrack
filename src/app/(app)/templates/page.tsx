import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { MessageSquare } from 'lucide-react'

export default async function TemplatesPage() {
  const employee = await requireAuth()
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('wa_templates')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">WhatsApp Templates</h1>
      <p className="text-sm text-slate-500">These templates are available when sending WhatsApp messages from lead detail pages.</p>
      <div className="space-y-4">
        {(templates || []).map(t => (
          <Card key={t.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={16} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{t.body}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!templates?.length && (
          <p className="text-sm text-slate-400 text-center py-8">No templates available. Ask your admin to add some.</p>
        )}
      </div>
    </div>
  )
}
