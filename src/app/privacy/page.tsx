import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Consultrack',
  description: 'How Consultrack collects, uses, and protects your data.',
}

const UPDATED = 'May 7, 2026'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f0f6f6] text-brand-800">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-xs text-brand-400 font-semibold">← Consultrack</Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-brand-400 mb-10">Last updated: {UPDATED}</p>

        <Section title="1. Who we are">
          <p>Consultrack (the &ldquo;Service&rdquo;) is a customer-relationship management
            platform for education consultancies and other businesses. This Privacy Policy
            describes how we collect, use, share, and protect personal information when
            you use the Service or when your data is sent to us by integrated third-party
            platforms such as Meta (Facebook and Instagram).</p>
        </Section>

        <Section title="2. Information we collect">
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Account data</strong>: name, email, role, organisation membership,
              authentication tokens, and audit metadata for users of the Service.</li>
            <li><strong>Lead data</strong>: contact details (name, phone, email, address),
              educational background, and other fields submitted via Meta Lead Ads,
              Instagram messages/comments/mentions, manual entry, or imported sources.</li>
            <li><strong>Integration data</strong>: identifiers and access tokens issued by
              Meta when an organisation connects its Facebook Page or Instagram Business
              Account; webhook payloads relating to lead generation, direct messages,
              comments, mentions, and conversion signals.</li>
            <li><strong>Usage data</strong>: device, browser, IP address, pages visited,
              and actions taken inside the Service for security and analytics.</li>
          </ul>
        </Section>

        <Section title="3. How we use information">
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide the core Service: routing leads to the right team member,
              tracking pipeline stages, and surfacing analytics.</li>
            <li>To send transactional notifications (deadline alerts, lead assignments,
              quota warnings) to authorised users within an organisation.</li>
            <li>To improve the Service, debug issues, and prevent abuse.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="4. Meta Platform data">
          <p>When an organisation connects a Facebook Page or Instagram Business Account,
            we receive webhook events and call Meta&rsquo;s Graph API on the
            organisation&rsquo;s behalf to fetch lead form responses, message senders,
            and comment authors. Permissions used include
            <code className="font-mono text-xs"> leads_retrieval</code>,
            <code className="font-mono text-xs"> pages_show_list</code>,
            <code className="font-mono text-xs"> pages_manage_metadata</code>,
            <code className="font-mono text-xs"> pages_read_engagement</code>,
            <code className="font-mono text-xs"> instagram_basic</code>,
            <code className="font-mono text-xs"> instagram_manage_messages</code>,
            <code className="font-mono text-xs"> instagram_manage_comments</code>, and
            <code className="font-mono text-xs"> instagram_manage_insights</code>.</p>
          <p className="mt-3">We use Meta data exclusively to populate the connected
            organisation&rsquo;s CRM. We do not sell, rent, or share Meta-derived data
            with third parties for advertising, model training, or any unrelated
            purpose.</p>
        </Section>

        <Section title="5. Data sharing">
          <p>We share data only with:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Authorised users within the organisation that owns the data.</li>
            <li>Sub-processors that host or operate the Service (Supabase for database
              and authentication, Vercel for hosting, Meta for upstream platform
              integrations).</li>
            <li>Authorities, when required by law or to enforce our terms.</li>
          </ul>
        </Section>

        <Section title="6. Retention">
          <p>We retain organisation and lead data for as long as the organisation has an
            active subscription. After cancellation, data is retained for 30 days to
            allow recovery, then permanently deleted. Audit logs may be retained longer
            where required by law.</p>
        </Section>

        <Section title="7. Your rights">
          <p>Depending on your jurisdiction, you may have the right to access, correct,
            export, or delete your personal data, and to object to or restrict certain
            processing. To exercise any of these rights, contact us at the address
            below or visit our <Link href="/data-deletion" className="text-brand-400 underline">data deletion page</Link>.</p>
        </Section>

        <Section title="8. Security">
          <p>We use TLS for all data in transit, encrypted storage at rest, role-based
            access controls within the application, and signed-payload verification for
            inbound webhooks. No system is perfectly secure; we work continuously to
            improve our practices.</p>
        </Section>

        <Section title="9. Children">
          <p>The Service is not intended for children under 16. We do not knowingly
            collect data from children. If you believe we hold data about a child, please
            contact us so we can delete it.</p>
        </Section>

        <Section title="10. Changes">
          <p>We may update this policy. Material changes will be communicated via in-app
            notice or email. The &ldquo;Last updated&rdquo; date at the top reflects the most
            recent revision.</p>
        </Section>

        <Section title="11. Contact">
          <p>Questions about privacy: <a href="mailto:abhisheknair917@google.com" className="text-brand-400 underline">abhisheknair917@google.com</a></p>
        </Section>

        <div className="mt-16 pt-8 border-t border-brand-200 text-xs text-brand-400 flex gap-4">
          <Link href="/terms" className="underline">Terms of Service</Link>
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
