import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'

// Long-form setup walkthrough for the bridge "Client's own Meta app" mode.
// This doc captures every gotcha learned during the first integration
// session — Meta's UI shifts month-to-month so anything labelled
// "Pitfall" below is something a client WILL hit if they follow the
// happy path naively.

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-[var(--sa-text)] mt-10 mb-3 pb-2 border-b border-[var(--sa-border)]">{children}</h2>
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-neutral-200 mt-6 mb-2">{children}</h3>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--sa-text-secondary)] leading-relaxed mb-3">{children}</p>
}
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="w-7 h-7 rounded-full bg-[var(--sa-surface-hover)] border border-[var(--sa-border-strong)] text-xs font-bold text-[var(--sa-text-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--sa-text)] mb-1">{title}</p>
        <div className="text-xs text-[var(--sa-text-secondary)] leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  )
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[var(--sa-success)] bg-emerald-500/[0.08] px-1.5 py-0.5 rounded text-[11px]">{children}</code>
}
function Pitfall({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-amber-500/20 rounded-xl p-3.5 bg-amber-500/[0.04] my-4">
      <p className="text-xs font-semibold text-amber-300 mb-1">⚠ Pitfall — {title}</p>
      <div className="text-xs text-[var(--sa-text-secondary)] leading-relaxed">{children}</div>
    </div>
  )
}
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--sa-border)] rounded-xl p-3.5 bg-[var(--sa-surface)] my-4">
      <p className="text-xs text-[var(--sa-text-secondary)] leading-relaxed">{children}</p>
    </div>
  )
}
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[var(--sa-text)]/70 hover:text-[var(--sa-text)] underline underline-offset-2 transition-colors">
      {children} <ExternalLink size={10} />
    </a>
  )
}

export default function OwnMetaAppDoc() {
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-2xl mx-auto">

        <Link href="/superadmin/docs"
          className="inline-flex items-center gap-1.5 text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] text-sm mb-8 transition-colors">
          <ArrowLeft size={13} /> All docs
        </Link>

        <div className="mb-8">
          <p className="text-[11px] font-semibold text-[var(--sa-text-muted)] uppercase tracking-widest mb-2">Bridge guide</p>
          <h1 className="text-2xl font-semibold text-[var(--sa-text)] tracking-tight mb-2">Client&rsquo;s Own Meta App Setup</h1>
          <p className="text-sm text-[var(--sa-text-secondary)]">
            Step-by-step walkthrough for connecting a client&rsquo;s Facebook Page (and optionally Instagram Business
            Account) using their own Meta Developer App instead of Consultrack&rsquo;s. Use this mode while
            Consultrack&rsquo;s central app is going through Business Verification + App Review.
          </p>
        </div>

        <H2>When to use this mode</H2>
        <P>
          Switch the org&rsquo;s <strong className="text-[var(--sa-text)]">Connection mode</strong> in
          Superadmin to <em>Client&rsquo;s own app</em> when Consultrack&rsquo;s central Meta app
          isn&rsquo;t verified yet (the 60-75 day App Review window). Each client creates their own
          Meta app, points it at the same Consultrack webhook URL, and pastes three credentials
          (App ID, App Secret, Verify Token) into Superadmin. From the client&rsquo;s perspective
          inside Consultrack nothing differs — leads still flow into the same dashboard. The
          difference is operational: their Meta app is in <em>their</em> Business Manager, not
          Consultrack&rsquo;s.
        </P>
        <Note>
          Once Consultrack is verified, flip the toggle back to <em>Consultrack&rsquo;s app</em>
          and send the client a one-click reconnect link. Their lead history persists across the
          migration.
        </Note>

        <H2>Before you start — what the client needs</H2>
        <P>
          Get this list to the client a day before the setup call so they aren&rsquo;t hunting
          mid-call:
        </P>
        <ul className="list-disc pl-6 text-xs text-[var(--sa-text-secondary)] leading-relaxed space-y-1 mb-6">
          <li>A personal Facebook account (any account works — admin permissions on the Page in step 1 below)</li>
          <li>A Facebook <strong className="text-[var(--sa-text)]">Page</strong> for the business
            (create one at <A href="https://facebook.com/pages/create">facebook.com/pages/create</A>{' '}
            if they don&rsquo;t have one yet — takes 2 min)</li>
          <li>An <strong className="text-[var(--sa-text)]">Instagram Business Account</strong> linked to that Page (optional, only for IG features)</li>
          <li>~45 min uninterrupted on a desktop browser (the Meta Developer Console doesn&rsquo;t work well on mobile)</li>
          <li>Their physical proximity — Meta sometimes 2FAs the FB account during this flow</li>
        </ul>

        <H2>Part 1 — Create the Meta Developer App (5 min)</H2>

        <Step n={1} title="Sign in at developers.facebook.com">
          <p>Open <A href="https://developers.facebook.com">developers.facebook.com</A>. Click <strong className="text-[var(--sa-text)]">Get Started</strong> if it&rsquo;s the client&rsquo;s first visit; accept the developer terms.</p>
        </Step>

        <Step n={2} title="Create the app">
          <p>My Apps → <strong className="text-[var(--sa-text)]">Create App</strong>.</p>
          <p>Use case: <strong className="text-[var(--sa-text)]">Other</strong> → Next.</p>
          <p>App type: <strong className="text-[var(--sa-text)]">Business</strong> → Next.</p>
          <p>App name: anything recognisable, e.g. <em>Acme Marketing CRM</em>. Confirm with FB password.</p>
        </Step>

        <Step n={3} title="Copy App ID + App Secret">
          <p>Inside the app dashboard → left sidebar → <strong className="text-[var(--sa-text)]">App Settings → Basic</strong>.</p>
          <p>Copy the <strong className="text-[var(--sa-text)]">App ID</strong> (top of the page).</p>
          <p>Click <strong className="text-[var(--sa-text)]">Show</strong> next to <strong className="text-[var(--sa-text)]">App Secret</strong>, enter FB password again, copy the value.</p>
          <p>Both go into Superadmin → Org → Meta Integration → Client&rsquo;s own app — but don&rsquo;t paste yet, finish the rest first.</p>
        </Step>

        <H2>Part 2 — Fill in App Settings → Basic (5 min)</H2>

        <Step n={4} title="Add legal URLs">
          <p>While still on App Settings → Basic, paste:</p>
          <p>Privacy Policy URL: <Code>https://consultrackk.vercel.app/privacy</Code></p>
          <p>Terms of Service URL: <Code>https://consultrackk.vercel.app/terms</Code></p>
          <p>User Data Deletion: <Code>https://consultrackk.vercel.app/data-deletion</Code></p>
          <p>Category: <strong className="text-[var(--sa-text)]">Business and Pages</strong>.</p>
        </Step>

        <Step n={5} title="Upload App Icon">
          <p>Scroll to the App Icon field. Upload a 1024×1024 PNG.</p>
          <p>If the client has no logo handy, the Consultrack icon at <A href="https://consultrackk.vercel.app/consultrack-mark.svg">/consultrack-mark.svg</A>{' '}
            works. Save Changes at the bottom.</p>
        </Step>

        <H2>Part 3 — Pick a Verify Token (1 min)</H2>

        <Step n={6} title="Generate any random string">
          <p>The verify token is a shared secret between the client&rsquo;s Meta app and Consultrack&rsquo;s
            server. Pick anything random and memorable, e.g.</p>
          <p><Code>acme_meta_verify_2026</Code> or <Code>openssl rand -hex 16</Code>.</p>
          <p>You will paste this into both Superadmin (now) and Meta&rsquo;s webhook setup (in Part 6 below). It must match exactly.</p>
        </Step>

        <H2>Part 4 — Save what you have so far in Superadmin</H2>

        <Step n={7} title="Paste App ID + App Secret + Verify Token">
          <p>Open Superadmin → the client&rsquo;s org → Meta Integration → toggle <strong className="text-[var(--sa-text)]">Client&rsquo;s own app</strong>.</p>
          <p>Paste App ID, App Secret, Verify Token. Click Save Settings.</p>
          <p>This unlocks step 8: Meta&rsquo;s webhook verification will succeed because Consultrack now knows
            this org&rsquo;s verify token and accepts the GET handshake from any Meta app whose token matches.</p>
        </Step>

        <H2>Part 5 — Request Standard Access on permissions (5 min)</H2>

        <Step n={8} title="App Review → Permissions and Features">
          <p>Left sidebar → <strong className="text-[var(--sa-text)]">App Review → Permissions and Features</strong>.</p>
          <p>Click <strong className="text-[var(--sa-text)]">Get Advanced Access</strong> on these (Meta auto-grants Standard Access to a Business app for its own owned assets, which is what we need for testing):</p>
          <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
            <li><Code>leads_retrieval</Code> — without this, the leadgen webhook field is hidden in step 9</li>
            <li><Code>pages_show_list</Code></li>
            <li><Code>pages_manage_metadata</Code></li>
            <li><Code>pages_read_engagement</Code></li>
            <li><Code>pages_manage_ads</Code></li>
            <li>For Instagram: <Code>instagram_basic</Code>, <Code>instagram_manage_messages</Code>, <Code>instagram_manage_comments</Code>, <Code>instagram_manage_insights</Code></li>
          </ul>
        </Step>

        <Pitfall title="leads_retrieval is the gatekeeper">
          The <Code>leadgen</Code> field literally won&rsquo;t appear in the webhook subscription list
          until <Code>leads_retrieval</Code> shows Standard Access (green). Click <em>Get Advanced
          Access</em> on it first; it auto-flips to Standard Access for owned assets.
        </Pitfall>

        <H2>Part 6 — Add the Webhooks product (5 min)</H2>

        <Step n={9} title="Add Product → Webhooks → Set Up">
          <p>Left sidebar → <strong className="text-[var(--sa-text)]">+ Add Product</strong> → find <strong className="text-[var(--sa-text)]">Webhooks</strong> → Set Up.</p>
          <p>Top dropdown: select <strong className="text-[var(--sa-text)]">Page</strong>.</p>
          <p>Click <strong className="text-[var(--sa-text)]">Subscribe to this object</strong>. Enter:</p>
          <p>Callback URL: <Code>https://consultrackk.vercel.app/api/meta/webhook</Code></p>
          <p>Verify Token: the string from step 6.</p>
          <p>Click <strong className="text-[var(--sa-text)]">Verify and Save</strong>. Meta calls our GET endpoint; Consultrack matches the token to this org and returns the challenge.</p>
        </Step>

        <Pitfall title="Always use consultrackk.vercel.app, never admishine.vercel.app">
          The legacy domain <Code>admishine.vercel.app</Code> is a 308 redirect to{' '}
          <Code>consultrackk.vercel.app</Code>. Meta&rsquo;s GET verification follows the redirect
          and succeeds, but POST webhooks <em>do not follow redirects</em> — every lead, DM, and
          comment will silently disappear. Always paste the canonical URL above.
        </Pitfall>

        <Step n={10} title="Subscribe to the leadgen field">
          <p>After the URL is verified, the field list appears below it. Search for{' '}
            <Code>leadgen</Code> and toggle Subscribe.</p>
          <p>If <Code>leadgen</Code> isn&rsquo;t in the list, go back to step 8 and confirm{' '}
            <Code>leads_retrieval</Code> shows Standard Access.</p>
        </Step>

        <H2>Part 7 — Set up Instagram (optional, 5 min)</H2>

        <P>Skip this whole section if the client doesn&rsquo;t need IG DMs / Comments / Mentions.</P>

        <Step n={11} title="Add the Instagram product">
          <p>Left sidebar → <strong className="text-[var(--sa-text)]">+ Add Product</strong> → <strong className="text-[var(--sa-text)]">Instagram</strong> → Set Up.</p>
          <p>The new IG product UI shows four numbered steps. We only need 1 and 2.</p>
        </Step>

        <Step n={12} title="Step 1 — Add the IG account">
          <p>Click <strong className="text-[var(--sa-text)]">Add account</strong> on step 1. Log in with the IG Business Account credentials. Grant permissions.</p>
          <p>Once added, the access token + IG Business Account ID appear inline. Copy both — they go into Superadmin → Instagram Integration card.</p>
        </Step>

        <Step n={13} title="Step 2 — Configure webhooks">
          <p>If step 2 already shows green ✓ (it auto-configures from step 1 in some accounts), skip.</p>
          <p>If not: open it, paste the same Callback URL + Verify Token from Part 6, click Verify and Save.</p>
          <p>Then in the field list, subscribe: <Code>messages</Code>, <Code>comments</Code>,{' '}
            <Code>mentions</Code>. <em>Do not</em> look for <Code>leadgen</Code> here — IG Lead Ads still come through the Page object you set up in Part 6.</p>
        </Step>

        <Pitfall title="Skip step 3 (Business Login) and step 4 (App Review)">
          The IG product page nudges you toward both. Step 3 is for OAuth flows that connect
          third-party IG accounts (we don&rsquo;t use that). Step 4 is for going Live with
          general public access (we&rsquo;re only handling the client&rsquo;s own assets, which
          works fine in Live mode without App Review submissions).
        </Pitfall>

        <H2>Part 8 — Switch the app to Live (1 min)</H2>

        <Step n={14} title="Toggle App Mode: Development → Live">
          <p>Top of the dashboard, next to App Mode, flip the toggle from <strong className="text-[var(--sa-text)]">Development</strong> to <strong className="text-[var(--sa-text)]">Live</strong>.</p>
          <p>If Meta blocks the toggle with &ldquo;some permissions need access&rdquo;, go back to step 8 and confirm every permission shows at least Standard Access.</p>
        </Step>

        <Pitfall title="Development mode silently blocks production webhooks">
          The Webhooks page has a small red banner: <em>&ldquo;No production webhooks, including
          from app admins, developers or testers, will be delivered unless the app has been
          published.&rdquo;</em> If you forget step 14, every test you run from Lead Ads Testing
          and every real DM will arrive at Meta but never reach our server. The dashboard
          &ldquo;Test&rdquo; button will lie and say <em>success</em> regardless.
        </Pitfall>

        <H2>Part 9 — Get the Page Access Token (10 min, the trickiest part)</H2>

        <Step n={15} title="Open Graph API Explorer">
          <p>Tools → <A href="https://developers.facebook.com/tools/explorer">Graph API Explorer</A>.</p>
          <p>Top right: <strong className="text-[var(--sa-text)]">Meta App</strong> dropdown → select the app you just created.</p>
        </Step>

        <Step n={16} title="Generate a User Access Token">
          <p>Click <strong className="text-[var(--sa-text)]">Generate Access Token</strong>. A consent popup opens.</p>
          <p>Tick at minimum: <Code>pages_show_list</Code>, <Code>pages_manage_metadata</Code>, <Code>pages_read_engagement</Code>, <Code>leads_retrieval</Code>, <Code>pages_manage_ads</Code> (+ IG perms if used).</p>
          <p>The popup also shows a Page picker — <strong className="text-[var(--sa-text)]">make sure the client&rsquo;s Page is checked</strong>. Newly-created Pages default to unchecked.</p>
          <p>Click Continue. The Access Token field at the top of the explorer now holds a User Token.</p>
        </Step>

        <Pitfall title="If me/accounts returns empty data">
          That means the User Token doesn&rsquo;t see the Page yet — usually because the Page was
          created <em>after</em> the token was generated, or it wasn&rsquo;t ticked in the Page
          picker. Click <em>Generate Access Token</em> again, look for the small <em>Edit
          access</em> link in the consent popup, ensure the Page is checked. Workaround if the
          picker still doesn&rsquo;t list the Page: query <Code>{'{page_id}'}?fields=name,access_token</Code>{' '}
          directly with the User Token — that returns the Page Access Token without going through
          <Code>me/accounts</Code>.
        </Pitfall>

        <Step n={17} title="Extend to a long-lived token">
          <p>Default User Tokens last ~1 hour. Without extending, leads will stop arriving an hour after setup.</p>
          <p>Click the small <strong className="text-[var(--sa-text)]">i</strong> icon next to the Access Token field → <strong className="text-[var(--sa-text)]">Open in Access Token Tool</strong>.</p>
          <p>On the Access Token Tool page, scroll to the bottom of the diagnostics → click <strong className="text-[var(--sa-text)]">Extend Access Token</strong>. Confirm with FB password.</p>
          <p>Copy the long-lived User Token (~60 days). Paste it back into Graph API Explorer&rsquo;s Access Token field.</p>
        </Step>

        <Step n={18} title="Fetch the Page ID and Page Access Token">
          <p>In Graph API Explorer, query: <Code>me/accounts</Code> → Submit.</p>
          <p>In the JSON response, find the client&rsquo;s Page entry. Copy:</p>
          <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
            <li><Code>id</Code> — Page ID</li>
            <li><Code>access_token</Code> — Page Access Token (also long-lived because it inherited from the long-lived User Token)</li>
          </ul>
        </Step>

        <Step n={19} title="Subscribe the Page to leadgen via API">
          <p>App-level subscription (Part 6) tells Meta that the app cares about leadgen.
            Page-level subscription tells the Page itself to forward leadgen events to the app.
            Both are required.</p>
          <p>In Graph API Explorer:</p>
          <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
            <li>Method dropdown (top left): GET → <strong className="text-[var(--sa-text)]">POST</strong></li>
            <li>Query: <Code>{'{page_id}/subscribed_apps'}</Code></li>
            <li>Add a parameter: name <Code>subscribed_fields</Code>, value <Code>leadgen</Code></li>
            <li><strong className="text-[var(--sa-text)]">Paste the Page Access Token directly into the Access Token field</strong> — not the User Token</li>
            <li>Submit. Expected: <Code>{'{"success":true}'}</Code></li>
          </ul>
        </Step>

        <Pitfall title="(#210) A page access token is required">
          You forgot to swap the Access Token field from User Token to Page Token. Both look like
          <Code>EAA...</Code> strings — they&rsquo;re different. Copy the <Code>access_token</Code>
          value from <Code>me/accounts</Code> response in step 18 and paste explicitly.
        </Pitfall>

        <H2>Part 10 — Lead Access Manager (2 min)</H2>

        <Step n={20} title="Grant lead access on the Page">
          <p>Open <Code>business.facebook.com/{'{page_id}'}/lead_access_manager</Code> directly (replace placeholder), or go via Business Suite → Page settings → Lead Access.</p>
          <p>Click <strong className="text-[var(--sa-text)]">Add People</strong> → add the client&rsquo;s
            FB profile → grant <strong className="text-[var(--sa-text)]">Lead Access</strong> + <strong className="text-[var(--sa-text)]">CRM Access</strong>.</p>
          <p>Without this, the Lead Ads Testing diagnostics show an orange triangle next to <em>Lead Access Manager Enabled</em>. The diagnostic is non-blocking for the page admin themselves but other team members won&rsquo;t see leads.</p>
        </Step>

        <H2>Part 11 — Save tokens in Superadmin and test</H2>

        <Step n={21} title="Paste Page ID + Page Access Token">
          <p>Superadmin → Meta Integration card → paste the Page ID and Page Access Token from step 18. Click Save Settings.</p>
          <p>If the org uses Instagram, also paste the IG Business Account ID + access token from step 12 into the Instagram Integration card.</p>
        </Step>

        <Step n={22} title="Click Test Connection">
          <p>The Meta Integration card has a <strong className="text-[var(--sa-text)]">Test Connection</strong> button. Click it.</p>
          <p>Expected: green toast with the Page name. If you get a red toast, the message is the actual Meta error — usually &ldquo;token expired&rdquo; or &ldquo;page not found&rdquo;.</p>
        </Step>

        <Step n={23} title="Fire a real test lead">
          <p><A href="https://developers.facebook.com/tools/lead-ads-testing">developers.facebook.com/tools/lead-ads-testing</A></p>
          <p>Select the app + the client&rsquo;s Page + a Lead Form. If no Lead Form exists yet, create one in Business Suite → Page → All Tools → Forms Library → Create. The form needs at least Name, Phone, Email and a privacy URL (use <Code>https://consultrackk.vercel.app/privacy</Code>).</p>
          <p>Preview Form → fill the test data → submit. The lead should appear in Consultrack within 5 seconds in <em>All Leads</em> or <em>Facebook Leads</em>.</p>
        </Step>

        <Pitfall title="The dashboard Test button is unreliable">
          The Webhooks product page has a Test button next to each subscribed field. It often
          claims success without actually delivering. Don&rsquo;t use it as the source of truth —
          always confirm by submitting a real test lead via Lead Ads Testing tool and watching
          Vercel logs / Consultrack&rsquo;s All Leads page.
        </Pitfall>

        <H2>Common pitfalls reference</H2>

        <Pitfall title="DM webhook fires but profile fetch fails (#200)">
          Standard Access on <Code>instagram_manage_messages</Code> can&rsquo;t fetch the profile of
          a sender who isn&rsquo;t in the app&rsquo;s test users list. The webhook still creates a
          lead — just with a placeholder name like <em>&ldquo;Instagram User 1234&rdquo;</em>. Real
          usernames will come once the app gets Advanced Access via App Review.
        </Pitfall>

        <Pitfall title="Token expires after a few hours">
          You skipped step 17 (Extend Access Token). Repeat the flow with the long-lived
          extension. Page tokens derived from a long-lived user token are typically 60 days,
          often never-expiring.
        </Pitfall>

        <Pitfall title="me/accounts returns empty after page creation">
          Click Generate Access Token again, find the <em>Edit access</em> link in the consent
          popup, ensure the Page is ticked. New Pages default to unchecked.
        </Pitfall>

        <H2>What changes once Consultrack is verified</H2>
        <P>
          Switch the org back to <strong className="text-[var(--sa-text)]">Connection mode: Consultrack&rsquo;s app</strong>.
          The per-app fields (App ID, Secret, Verify Token) clear automatically. Send the client
          a <em>Reconnect with Facebook</em> link — single OAuth click and they&rsquo;re migrated.
          All historical leads and conversation data persist; only the credentials wiring
          changes.
        </P>
      </div>
    </div>
  )
}
