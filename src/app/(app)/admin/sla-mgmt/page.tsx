import { redirect } from 'next/navigation'

// /admin/sla-mgmt is the operational view (live breach log).
// Thresholds (configuration) live in /admin/settings/sla-thresholds where
// they belong with the rest of the org configuration.
export default function SlaMgmtPage() {
  redirect('/admin/sla-mgmt/log')
}
