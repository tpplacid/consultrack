// Settings → Deadlines is the canonical home for SLA threshold configuration.
// This route is kept as a 308 so old bookmarks resolve cleanly.
import { redirect } from 'next/navigation'
export default function LegacyRedirect() {
  redirect('/admin/settings/sla-thresholds')
}
