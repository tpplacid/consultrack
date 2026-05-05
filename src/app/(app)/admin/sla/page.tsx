// /admin/sla was the old combined SLA page. Operational view is now at
// /admin/sla-mgmt/log; configuration at /admin/settings/sla-thresholds.
import { redirect } from 'next/navigation'
export default function LegacyRedirect() {
  redirect('/admin/sla-mgmt/log')
}
