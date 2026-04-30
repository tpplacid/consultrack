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
    icon: [
      { url: '/Consultrack Logo.png', type: 'image/png' },
    ],
    shortcut: '/Consultrack Logo.png',
    apple: [
      { url: '/Consultrack Logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Consultrack',
    startupImage: '/Consultrack Logo.png',
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
