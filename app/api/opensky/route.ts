// ============================================================
// API Route: /api/opensky — Real aircraft tracking
// OpenSky Network (free, no API key required)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchAircraft } from '@/lib/livedata'

export const maxDuration = 15

const CACHE_TTL = 30_000 // 30 seconds
let cache: { data: any; ts: number } | null = null

export async function GET(request: NextRequest) {
  try {
    // Check cache
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=30' },
      })
    }

    const aircraft = await fetchAircraft()

    // Filter params
    const url = new URL(request.url)
    const category = url.searchParams.get('category') // military, government, civilian
    const country = url.searchParams.get('country')

    let filtered = aircraft
    if (category) filtered = filtered.filter(a => a.category === category)
    if (country) filtered = filtered.filter(a => a.originCountry.toLowerCase().includes(country.toLowerCase()))

    const result = {
      count: filtered.length,
      totalInRegion: aircraft.length,
      timestamp: Date.now(),
      aircraft: filtered,
    }

    cache = { data: result, ts: Date.now() }

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=30' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch aircraft data', details: err.message },
      { status: 500 }
    )
  }
}
