// Single source of truth for the Meta/Instagram webhook URL displayed
// in Superadmin and the org admin's setup pages. Hardcoded to the
// canonical consultrackk.vercel.app domain because the legacy
// admishine.vercel.app alias is a 308 redirect — Meta's GET handshake
// follows the redirect and succeeds, but POST webhooks don't follow
// redirects, so leads and DMs sent to admishine silently disappear.
//
// Anyone copying this value from the UI into Meta's Webhooks console
// should always end up with consultrackk.

export const META_WEBHOOK_URL = 'https://consultrackk.vercel.app/api/meta/webhook'
