import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Consultrack',
  description: 'Terms governing your use of the Consultrack platform.',
}

const UPDATED = 'May 7, 2026'

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#f0f6f6] text-brand-800">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-xs text-brand-400 font-semibold">← Consultrack</Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">Terms of Service</h1>
        <p className="text-sm text-brand-400 mb-10">Last updated: {UPDATED}</p>

        <Section title="1. Acceptance">
          <p>By accessing or using Consultrack (the &ldquo;Service&rdquo;), you agree to
            be bound by these Terms. If you are accepting on behalf of an organisation,
            you represent that you have authority to bind that organisation.</p>
        </Section>

        <Section title="2. The service">
          <p>Consultrack is a multi-tenant CRM that connects to third-party platforms
            (including Meta) to ingest leads, route them to your team, and track them
            through a pipeline. Features may evolve over time.</p>
        </Section>

        <Section title="3. Accounts">
          <p>You are responsible for safeguarding your credentials and for all activity
            under your account. Notify us immediately of any unauthorised use.</p>
        </Section>

        <Section title="4. Acceptable use">
          <ul className="list-disc pl-6 space-y-2">
            <li>Do not use the Service to violate any law or third-party rights.</li>
            <li>Do not attempt to disrupt the Service, reverse-engineer it, or access
              data you are not authorised to access.</li>
            <li>Do not upload material that is illegal, harassing, or infringes
              intellectual property.</li>
            <li>Comply with the platform policies of any integrated third party,
              including Meta&rsquo;s Platform Terms and Developer Policies.</li>
          </ul>
        </Section>

        <Section title="5. Customer data">
          <p>You retain all rights to data you submit. You grant us a limited licence to
            process that data solely to provide the Service. Our handling of personal
            information is described in the
            <Link href="/privacy" className="text-brand-400 underline"> Privacy Policy</Link>.</p>
        </Section>

        <Section title="6. Third-party integrations">
          <p>The Service relies on third-party platforms (Meta, Supabase, Vercel, and
            others). Their availability and terms are outside our control. We are not
            liable for outages, policy changes, or data losses caused by those
            platforms.</p>
        </Section>

        <Section title="7. Fees">
          <p>Paid plans are billed in advance per the pricing communicated at sign-up.
            Fees are non-refundable except where required by law. We may revise pricing
            with 30 days&rsquo; notice.</p>
        </Section>

        <Section title="8. Termination">
          <p>You may stop using the Service at any time. We may suspend or terminate
            access for breach of these Terms, for non-payment, or to comply with law.
            On termination, your data will be handled per the retention rules in the
            Privacy Policy.</p>
        </Section>

        <Section title="9. Disclaimer">
          <p>The Service is provided &ldquo;as is&rdquo; without warranties of any
            kind. We do not warrant that it will be error-free or uninterrupted, or
            that any data will be delivered in real time.</p>
        </Section>

        <Section title="10. Limitation of liability">
          <p>To the maximum extent permitted by law, our aggregate liability for any
            claim arising out of these Terms or the Service will not exceed the fees
            paid by you to us in the twelve months preceding the claim.</p>
        </Section>

        <Section title="11. Changes">
          <p>We may update these Terms. Material changes will be communicated via
            in-app notice or email. Continued use of the Service after the effective
            date constitutes acceptance.</p>
        </Section>

        <Section title="12. Governing law">
          <p>These Terms are governed by the laws of India. Disputes will be resolved
            in the competent courts of Hyderabad, Telangana, unless otherwise required
            by applicable law.</p>
        </Section>

        <Section title="13. Contact">
          <p>Questions: <a href="mailto:abhisheknair917@google.com" className="text-brand-400 underline">abhisheknair917@google.com</a></p>
        </Section>

        <div className="mt-16 pt-8 border-t border-brand-200 text-xs text-brand-400 flex gap-4">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/data-deletion" className="underline">Data Deletion</Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 text-sm leading-relaxed">
      <h2 className="text-base font-bold mb-3">{title}</h2>
      {children}
    </section>
  )
}
