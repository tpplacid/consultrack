import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

// Note: the already-authenticated redirect (/superadmin/login → /superadmin/orgs)
// is handled in middleware so it carries Cache-Control: no-store.
export default function SuperAdminLoginPage() {
  return <LoginForm />
}
