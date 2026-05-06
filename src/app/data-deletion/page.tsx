import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Data Deletion — Consultrack',
  description: 'How to request deletion of your data from Consultrack.',
}

const UPDATED = 'May 7, 2026'
const SUPPORT_EMAIL = 'abhisheknair917@google.com'

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#f0f6f6] text-brand-800">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-xs text-brand-400 font-semibold">← Consultrack</Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">Data Deletion Instructions</h1>
        <p className="text-sm text-brand-400 mb-10">Last updated: {UPDATED}</p>

        <Section title="What this page is for">
          <p>If you would like Consultrack to delete data we hold about you — including
            data ingested from your Facebook Page or Instagram Business Account — you
            can request deletion in any of the ways below.</p>
        </Section>

        <Section title="If you are an end-user (lead)">
          <p>Your details may have reached Consultrack because you submitted a Meta Lead
            Ad form, sent a direct message, commented on, or mentioned a business that
            uses Consultrack as its CRM. To delete that record:</p>
          <ol className="list-decimal pl-6 mt-3 space-y-2">
            <li>Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Data%20deletion%20request`} className="text-brand-400 underline">{SUPPORT_EMAIL}</a> from
              the email or phone-linked account associated with the lead, or include
              your full name and the business you contacted.</li>
            <li>Include the subject &ldquo;Data deletion request&rdquo; and any
              identifying details (name, phone, email, the business you reached out
              to).</li>
            <li>We will verify the request, instruct the relevant business to delete
              the record, and confirm completion within 30 days.</li>
          </ol>
        </Section>

        <Section title="If you are an organisation (Consultrack customer)">
          <ol className="list-decimal pl-6 space-y-2">
            <li>Sign in to Consultrack as an admin.</li>
            <li>Open Settings → Organisation → Data &amp; Privacy.</li>
            <li>Click <strong>Request account deletion</strong>. All organisation,
              employee, and lead data will be permanently deleted within 30 days.</li>
            <li>Alternatively, email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-400 underline">{SUPPORT_EMAIL}</a> from
              your registered admin address.</li>
          </ol>
        </Section>

        <Section title="Disconnecting Meta data without deleting your account">
          <p>If you only want to stop sharing Meta (Facebook/Instagram) data with
            Consultrack but keep using the service:</p>
          <ol className="list-decimal pl-6 mt-3 space-y-2">
            <li>Open <a href="https://www.facebook.com/settings?tab=business_tools" className="text-brand-400 underline" rel="noopener noreferrer" target="_blank">Facebook
              Business Integrations settings</a>.</li>
            <li>Find &ldquo;Consultrack&rdquo; in the list and click <strong>Remove</strong>.</li>
            <li>Tokens issued to us are revoked immediately, and we stop receiving
              webhook events for your Page and Instagram account.</li>
          </ol>
          <p className="mt-3">Within 30 days of disconnection, all Meta-derived
            identifiers (page IDs, Instagram account IDs, access tokens, sender IDs,
            comment IDs, mention IDs) tied to your account will be deleted from our
            systems unless you have already deleted the related leads from Consultrack.</p>
        </Section>

        <Section title="What we delete">
          <ul className="list-disc pl-6 space-y-2">
            <li>Lead records (name, phone, email, custom fields, activity history).</li>
            <li>Meta integration configuration (page IDs, IG account IDs, access
              tokens).</li>
            <li>Webhook payload archives associated with the deleted lead or
              organisation.</li>
            <li>User accounts within the organisation, including authentication
              records.</li>
          </ul>
          <p className="mt-3">Anonymised aggregate metrics (counts, no personal data)
            and audit logs required for legal compliance may be retained beyond the
            deletion window.</p>
        </Section>

        <Section title="Timeline">
          <p>We complete deletion requests within 30 days of receipt. We will email
            confirmation to the requester once the deletion is complete.</p>
        </Section>

        <Section title="Contact">
          <p>For all data deletion requests:
            {' '}<a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-400 underline">{SUPPORT_EMAIL}</a></p>
        </Section>

        <div className="mt-16 pt-8 border-t border-brand-200 text-xs text-brand-400 flex gap-4">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
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
