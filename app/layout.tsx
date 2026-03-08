import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'INTEL LIVE — Real-Time Geopolitical Intelligence',
  description:
    'Professional real-time OSINT intelligence monitoring platform. Tracking Iran–Israel–USA conflict and Middle East developments with AI-powered analysis.',
  keywords: [
    'OSINT', 'intelligence', 'Iran', 'Israel', 'Middle East', 'geopolitical', 'military',
    'real-time', 'monitoring', 'conflict', 'Persian Gulf',
  ],
  authors: [{ name: 'Intel Live' }],
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'INTEL LIVE — Real-Time Geopolitical Intelligence',
    description: 'AI-powered OSINT monitoring platform for the Iran-Israel-US conflict.',
    type: 'website',
    siteName: 'Intel Live',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#060A0F',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="prefetch" href="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg" as="image" />
        <link rel="prefetch" href="//unpkg.com/three-globe/example/img/night-sky.png" as="image" />
      </head>
      <body className="h-full overflow-hidden bg-[#060A0F] text-[#E5E7EB]">
        {children}
      </body>
    </html>
  )
}
