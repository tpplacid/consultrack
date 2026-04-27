import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // All superadmin pages — never let browsers / Arc / CDN cache these.
        // Without this, Arc caches the 307 redirect from /superadmin/login →
        // /superadmin/orgs (emitted while logged in) and replays it after
        // logout, making it look like the session is still active.
        source: '/superadmin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
        ],
      },
      {
        // Superadmin API routes (login, logout) — same reason.
        source: '/api/superadmin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
        ],
      },
    ]
  },
};

export default nextConfig;
