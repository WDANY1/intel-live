import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'INTEL LIVE — Real-Time OSINT Intelligence Platform',
  description: 'AI-powered real-time OSINT monitoring platform. Iran · Israel · Middle East · Persian Gulf conflict intelligence.',
  keywords: ['OSINT','intelligence','Iran','Israel','Middle East','military','real-time','conflict'],
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#030712',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="prefetch" href="//unpkg.com/three-globe/example/img/earth-dark.jpg" as="image" />
        <link rel="prefetch" href="//unpkg.com/three-globe/example/img/night-sky.png" as="image" />
      </head>
      <body className="h-full overflow-hidden bg-[#030712] text-[#E2E8F0]">
        {children}
      </body>
    </html>
  )
}
