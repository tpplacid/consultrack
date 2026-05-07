import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const DOCS = [
  {
    slug: 'meta-integration',
    title: 'Facebook Lead Integration',
    desc:  'Full setup guide — create the Meta App, connect client Facebook pages, configure per-org tokens, and understand the end-to-end Facebook lead flow.',
  },
  {
    slug: 'instagram-integration',
    title: 'Instagram Lead Integration',
    desc:  'Connect Instagram Business Accounts to auto-import leads from Instagram Lead Ads — bifurcated from Facebook with separate config, routing, and admin view.',
  },
  {
    slug: 'own-meta-app',
    title: "Client's Own Meta App Setup",
    desc:  'Bridge guide for the App Review window — onboard a client by having them create their own Meta Developer app and pasting App ID + Secret + Verify Token into Superadmin. Captures every gotcha from the first-integration session.',
  },
]

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/superadmin/orgs"
          className="inline-flex items-center gap-1.5 text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] text-sm mb-8 transition-colors">
          <ArrowLeft size={13} /> Dashboard
        </Link>

        <h1 className="text-2xl font-semibold text-[var(--sa-text)] tracking-tight mb-1">Docs</h1>
        <p className="text-[var(--sa-text-muted)] text-sm mb-8">Internal reference for Consultrack platform setup and integrations.</p>

        <div className="space-y-2">
          {DOCS.map(doc => (
            <Link key={doc.slug} href={`/superadmin/docs/${doc.slug}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--sa-divider)] bg-[var(--sa-surface)] hover:bg-[var(--sa-surface-hover)] hover:border-white/[0.12] transition-all group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--sa-text)]">{doc.title}</p>
                <p className="text-xs text-[var(--sa-text-muted)] mt-0.5 truncate">{doc.desc}</p>
              </div>
              <ArrowRight size={14} className="text-[var(--sa-text-muted)] group-hover:text-[var(--sa-text)] transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
