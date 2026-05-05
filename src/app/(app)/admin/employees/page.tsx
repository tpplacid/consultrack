// Legacy route — kept as a 308 redirect so any old bookmarks / browser
// history land on the canonical location. The actual UI lives in the
// sibling client component (still imported by the canonical page).
import { redirect } from 'next/navigation'
export default function LegacyRedirect() {
  redirect('/admin/team-mgmt/employees')
}
