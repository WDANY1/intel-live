// ============================================================
// API Route: /api/status — System status and health check
// ============================================================

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cacheStats = cache.stats()

  return NextResponse.json({
    status: 'operational',
    timestamp: Date.now(),
    uptime: process.uptime(),
    cache: cacheStats,
    endpoints: {
      opensky: '/api/opensky',
      firms: '/api/firms',
      events: '/api/events',
      rss: '/api/rss',
      claude: '/api/claude',
      stream: '/api/stream',
    },
    version: 'v9-phase4',
  })
}
