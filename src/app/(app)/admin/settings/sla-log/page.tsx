// The breach log is operational, not configuration — moved to /admin/sla-mgmt/log.
import { redirect } from 'next/navigation'
export default function LegacyRedirect() {
  redirect('/admin/sla-mgmt/log')
}
