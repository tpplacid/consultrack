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
    // Browser favicon: tight crop so it stays legible at 16×16
    icon: [
      { url: '/consultrackk-logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/consultrackk-logo.svg',
    // iOS home screen: padded version so the icon doesn't look zoomed-in
    apple: [
      { url: '/consultrackk-logo-pwa.svg', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Consultrack',
    startupImage: '/consultrackk-logo-pwa.svg',
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
            style: { fontSize: 14, maxWidth: 360 },
          }}
        />
      </body>
    </html>
  )
}
