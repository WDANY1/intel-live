// ============================================================
// API Route: /api/events — NASA EONET + GDELT combined events
// Natural events + geopolitical events (free)
// ============================================================

import { NextResponse } from 'next/server'
import { fetchNaturalEvents, fetchGDELTEvents } from '@/lib/livedata'

export const maxDuration = 15

const CACHE_TTL = 300_000 // 5 minutes
let cache: { data: any; ts: number } | null = null

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=300' },
      })
    }

    const [natural, gdelt] = await Promise.allSettled([
      fetchNaturalEvents(),
      fetchGDELTEvents(),
    ])

    const result = {
      timestamp: Date.now(),
      natural: {
        count: natural.status === 'fulfilled' ? natural.value.length : 0,
        events: natural.status === 'fulfilled' ? natural.value : [],
      },
      gdelt: {
        count: gdelt.status === 'fulfilled' ? gdelt.value.length : 0,
        events: gdelt.status === 'fulfilled' ? gdelt.value : [],
      },
    }

    cache = { data: result, ts: Date.now() }

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=300' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch events', details: err.message },
      { status: 500 }
    )
  }
}
