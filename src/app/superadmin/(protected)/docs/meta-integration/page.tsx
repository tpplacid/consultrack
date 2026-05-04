import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'

// ── Prose primitives ──────────────────────────────────────────
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-white mt-10 mb-3 pb-2 border-b border-white/[0.07]">{children}</h2>
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-neutral-200 mt-6 mb-2">{children}</h3>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-400 leading-relaxed mb-3">{children}</p>
}
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-bold text-neutral-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white mb-1">{title}</p>
        <div className="text-xs text-neutral-500 leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  )
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-emerald-400 bg-emerald-500/[0.08] px-1.5 py-0.5 rounded text-[11px]">{children}</code>
}
function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto my-3 leading-relaxed whitespace-pre">
      {children}
    </pre>
  )
}
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-white/[0.08] rounded-xl p-3.5 bg-white/[0.02] my-4">
      <p className="text-xs text-neutral-500 leading-relaxed">{children}</p>
    </div>
  )
}
function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.07]">
            {['What', 'Scope', 'Where stored'].map(h => (
              <th key={h} className="text-left px-3 py-2 text-neutral-600 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([what, scope, where], i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              <td className="px-3 py-2.5 text-neutral-300 font-medium">{what}</td>
              <td className="px-3 py-2.5 text-neutral-500">{scope}</td>
              <td className="px-3 py-2.5 text-neutral-500">{where}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-white/70 hover:text-white underline underline-offset-2 transition-colors">
      {children} <ExternalLink size={10} />
    </a>
  )
}
function FlowStep({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="px-4 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-xs text-neutral-300 text-center font-medium w-64">{label}</div>
      {sub && <p className="text-[10px] text-neutral-700 mt-0.5 mb-0.5">{sub}</p>}
    </div>
  )
}
function Arrow() {
  return <div className="w-px h-4 bg-white/[0.1] mx-auto" />
}

// ── Page ─────────────────────────────────────────────────────
export default function MetaIntegrationDoc() {
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link href="/superadmin/docs"
          className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={13} /> All docs
        </Link>

        {/* Title */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-2">Integration guide</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">Meta Lead Integration</h1>
          <p className="text-sm text-neutral-500">
            End-to-end setup for connecting client Facebook &amp; Instagram Lead Ad forms to the Consultrackk pipeline.
          </p>
        </div>

        {/* Overview */}
        <H2>Overview</H2>
        <P>
          One Meta Developer App (owned by you, Consultrackk) acts as the bridge between all client Facebook Pages and the platform.
          When a lead fills a Meta Lead Ad form on any client's page, Meta sends a webhook event to your server. The server identifies
          the org by Page ID, fetches the lead data using that org's Page Access Token, and inserts the lead into their pipeline —
          fully automated, no manual entry.
        </P>

        <Table rows={[
          ['App Secret',         'Global — your Meta App',  'Vercel env → META_APP_SECRET'],
          ['Verify Token',       'Global — your Meta App',  'Vercel env → META_VERIFY_TOKEN'],
          ['Page ID',            'Per client org',          'Superadmin → org → Meta Integration'],
          ['Page Access Token',  'Per client org',          'Superadmin → org → Meta Integration'],
        ]} />

        {/* Lead flow */}
        <H2>Lead flow</H2>
        <div className="my-5">
          <FlowStep label="Lead submits a Meta Lead Ad form" />
          <Arrow />
          <FlowStep label="Meta sends POST to your webhook" sub="consultrackk.vercel.app/api/meta/webhook" />
          <Arrow />
          <FlowStep label="Signature verified using META_APP_SECRET" />
          <Arrow />
          <FlowStep label="Page ID looked up → org identified" />
          <Arrow />
          <FlowStep label="Meta Graph API called using org's access_token" sub="Fetches: name, phone, email, course, city" />
          <Arrow />
          <FlowStep label="Duplicate check (phone + meta_lead_id)" />
          <Arrow />
          <FlowStep label="Weighted allocation → employee assigned" />
          <Arrow />
          <FlowStep label="Lead inserted at Stage 0, employee notified" />
        </div>

        {/* Part 1 */}
        <H2>Part 1 — One-time setup (you, once)</H2>

        <H3>Create the Meta Developer App</H3>
        <Step n={1} title="Create the app">
          <p>Go to <A href="https://developers.facebook.com">developers.facebook.com</A> → My Apps → Create App.</p>
          <p>Choose <strong className="text-neutral-300">Other</strong> → <strong className="text-neutral-300">Business</strong> type. Name it <em>Consultrackk</em> and attach your Business portfolio.</p>
        </Step>

        <Step n={2} title="Get the App Secret">
          <p>Inside your app → <strong className="text-neutral-300">Settings → Basic</strong>.</p>
          <p>Click Show next to <strong className="text-neutral-300">App Secret</strong> → copy it.</p>
          <p>Add to Vercel: <Code>META_APP_SECRET = (value)</Code></p>
        </Step>

        <Step n={3} title="Set a Verify Token">
          <p>Choose any string, e.g. <Code>consultrackk_wh_2024</Code>. Keep it secret.</p>
          <p>Add to Vercel: <Code>META_VERIFY_TOKEN = (your string)</Code></p>
        </Step>

        <H3>Configure the Webhook</H3>
        <Step n={4} title="Add Webhooks product">
          <p>App dashboard → <strong className="text-neutral-300">Add Product → Webhooks</strong>.</p>
          <p>Under Webhooks → <strong className="text-neutral-300">Page</strong> → click <strong className="text-neutral-300">Subscribe to this object</strong>.</p>
        </Step>

        <Step n={5} title="Register the endpoint">
          <p>Enter:</p>
          <p>Callback URL: <Code>https://consultrackk.vercel.app/api/meta/webhook</Code></p>
          <p>Verify Token: the value you set in Step 3.</p>
          <p>Click <strong className="text-neutral-300">Verify and Save</strong> — Meta calls your GET endpoint to confirm. Then find the <strong className="text-neutral-300">leadgen</strong> field and click <strong className="text-neutral-300">Subscribe</strong>.</p>
        </Step>

        <Note>
          Leads are routed to the correct org by matching the incoming Facebook Page ID against <Code>meta_config.page_id</Code> stored per org in superadmin. Make sure every org's Page ID is configured before going live.
        </Note>

        {/* Part 2 */}
        <H2>Part 2 — Per-client setup</H2>

        <H3>Connect the client's Facebook Page</H3>
        <Step n={1} title="Client grants your app access">
          <p>Client goes to <A href="https://business.facebook.com">Meta Business Suite</A> → Settings → Integrations → Connected Apps.</p>
          <p>They add your App ID and grant <strong className="text-neutral-300">Leads Access</strong> for their Page.</p>
        </Step>

        <Step n={2} title="Generate a Page Access Token">
          <p>Go to the <A href="https://developers.facebook.com/tools/explorer/">Graph API Explorer</A> → select your app → click <strong className="text-neutral-300">Generate Access Token</strong> → select the client's Page.</p>
          <p>Request permissions: <Code>pages_show_list</Code>, <Code>leads_retrieval</Code>, <Code>pages_read_engagement</Code>.</p>
          <p>Exchange the short-lived token for a long-lived one:</p>
        </Step>

        <CodeBlock>{`GET https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}`}</CodeBlock>

        <P>The response contains a long-lived token. This is what goes into the org's access token field.</P>

        <Step n={3} title="Find the client's Facebook Page ID">
          <p>Option A: Facebook Page → About → Page ID (shown at the bottom).</p>
          <p>Option B: Business Suite → Settings → Page Info.</p>
          <p>It's a numeric string like <Code>123456789012345</Code>.</p>
        </Step>

        <Step n={4} title="Enter in Superadmin">
          <p>Superadmin → client org → <strong className="text-neutral-300">Settings → Meta Integration</strong>.</p>
          <p>Enter Page ID and Page Access Token → Save.</p>
          <p>Click <strong className="text-neutral-300">Send Setup Guide</strong> — this makes the setup guide visible on the client's Meta Leads settings page.</p>
        </Step>

        {/* Part 3 */}
        <H2>Part 3 — What the client does</H2>
        <P>After you click Send Setup Guide, the client admin will see a setup card on their Settings → Meta Leads page with:</P>
        <ul className="text-sm text-neutral-400 space-y-1.5 mb-4 pl-4">
          <li className="list-disc">The webhook callback URL (pre-filled, copy button)</li>
          <li className="list-disc">The verify token (pre-filled, copy button)</li>
          <li className="list-disc">Numbered steps linking to Meta for Developers and Business Suite</li>
          <li className="list-disc">Page ID connection status (shows as confirmed once you've configured it)</li>
        </ul>
        <P>From the client's side, their main task is ensuring their Lead Ad forms are active and their Page is connected to your app via Business Suite. The technical webhook setup is done entirely on your end.</P>

        {/* Token expiry */}
        <H2>Token expiry</H2>
        <P>
          Long-lived Page Access Tokens for Pages do not expire as long as the app retains <Code>pages_show_list</Code> permission and the token is used within a 60-day rolling window.
          In practice, as long as leads are coming in regularly the token stays alive indefinitely.
        </P>
        <P>
          If a token expires you will see Graph API errors in Vercel logs (function logs → api/meta/webhook). Simply regenerate via Graph Explorer and update in superadmin → org → Meta Integration.
        </P>

        {/* Troubleshooting */}
        <H2>Troubleshooting</H2>
        <div className="space-y-3">
          {[
            {
              q: 'Webhook verification failing (GET returns 403)',
              a: 'META_VERIFY_TOKEN in Vercel does not match what you entered in Meta Developer Console. They must be identical.',
            },
            {
              q: 'Leads arriving but owner_id is null',
              a: 'No active, auto-allocate-enabled employees available at the time of lead receipt. Check is_active, is_on_leave, auto_allocate on employee records, and weekoffs.',
            },
            {
              q: 'Graph API error: Invalid OAuth access token',
              a: "The org's Page Access Token has expired or been revoked. Regenerate via Graph Explorer and update in superadmin.",
            },
            {
              q: 'Leads going to the wrong org',
              a: "The Page ID in meta_config doesn't match the Facebook Page ID sending the events. Verify entry.id in Vercel logs matches what's stored.",
            },
            {
              q: 'Duplicate leads appearing',
              a: 'Dedup runs on phone + meta_lead_id per org. If the same phone appears on a different org, both will insert — this is expected.',
            },
          ].map((item, i) => (
            <div key={i} className="border border-white/[0.06] rounded-xl p-4">
              <p className="text-xs font-semibold text-neutral-300 mb-1">{item.q}</p>
              <p className="text-xs text-neutral-600">{item.a}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.06]">
          <p className="text-[11px] text-neutral-700">Consultrackk internal docs · Meta Integration</p>
        </div>

      </div>
    </div>
  )
}
