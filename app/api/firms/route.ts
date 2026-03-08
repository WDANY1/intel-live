// ============================================================
// API Route: /api/firms — NASA FIRMS fire/hotspot detection
// Satellite-detected thermal anomalies (free)
// ============================================================

import { NextResponse } from 'next/server'
import { fetchFires } from '@/lib/livedata'

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

    const fires = await fetchFires()

    const result = {
      count: fires.length,
      timestamp: Date.now(),
      hotspots: fires,
    }

    cache = { data: result, ts: Date.now() }

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=300' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch fire data', details: err.message },
      { status: 500 }
    )
  }
}
