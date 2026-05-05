import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Consultrack',
  description: 'Built for speed. Built for your process.',
  icons: {
    // Single canonical brand mark — indigo rounded square with white Consultrack
    // glyphs. SVG scales cleanly at any tab/PWA/home-screen size.
    icon: [
      { url: '/consultrack-mark.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/consultrack-mark.svg',
    apple: [
      { url: '/consultrack-mark.svg', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Consultrack',
    startupImage: '/consultrack-mark.svg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize: 14,
              maxWidth: 360,
              background: '#0f172a',         // slate-900 — high-contrast dark surface
              color: '#f1f5f9',              // slate-100
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              boxShadow: '0 10px 24px -8px rgba(15,23,42,0.35), 0 4px 8px -4px rgba(15,23,42,0.20)',
            },
            // Per-type accent strip on the left — matches the Consultrack indigo
            success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#0f172a' } },
            loading: { iconTheme: { primary: '#818cf8', secondary: '#0f172a' } },
          }}
        />
      </body>
    </html>
  )
}
