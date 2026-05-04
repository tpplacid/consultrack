import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const DOCS = [
  {
    slug: 'meta-integration',
    title: 'Meta Lead Integration',
    desc:  'Full setup guide — create the Meta App, connect client pages, configure per-org tokens, and understand the end-to-end lead flow.',
  },
]

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: '#000' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/superadmin/orgs"
          className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={13} /> Dashboard
        </Link>

        <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Docs</h1>
        <p className="text-neutral-600 text-sm mb-8">Internal reference for Consultrackk platform setup and integrations.</p>

        <div className="space-y-2">
          {DOCS.map(doc => (
            <Link key={doc.slug} href={`/superadmin/docs/${doc.slug}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{doc.title}</p>
                <p className="text-xs text-neutral-600 mt-0.5 truncate">{doc.desc}</p>
              </div>
              <ArrowRight size={14} className="text-neutral-700 group-hover:text-white transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
